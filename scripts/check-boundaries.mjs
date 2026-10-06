import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve('src');
const violations = [];
// Integrations consume these deliberately approved public client entry points.
const featureDependencies = {
  users: ['auth'],
  catalog: ['auth', 'cart'],
  classes: ['auth', 'catalog', 'users'],
  cart: ['auth'],
  orders: ['auth', 'cart', 'payments'],
  payments: ['auth'],
  learning: ['auth'],
};
async function visitDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await visitDirectory(file);
      continue;
    }
    if (!/\.tsx?$/.test(file)) continue;
    const source = ts.createSourceFile(
      file,
      await readFile(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const from = relative(root, file).replaceAll('\\', '/');
    function check(specifier) {
      if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return;
      const target = specifier.startsWith('@/')
        ? resolve(root, specifier.slice(2))
        : resolve(dirname(file), specifier);
      const to = relative(root, target)
        .replaceAll('\\', '/')
        .replace(/\.(tsx?|jsx?)$/, '');
      const feature = from.match(/^features\/([^/]+)\//)?.[1];
      const targetFeature = to.match(/^features\/([^/]+)\//)?.[1];
      const publicApi = /^features\/[^/]+\/(client|server)$/.test(to);
      let reason;
      if (from.startsWith('shared/') && /^(app|features)\//.test(to))
        reason = 'shared cannot depend on app/features';
      else if (feature && to.startsWith('app/')) reason = 'features cannot depend on app';
      else if (
        feature &&
        targetFeature &&
        feature !== targetFeature &&
        !(
          featureDependencies[feature]?.includes(targetFeature) &&
          to === `features/${targetFeature}/client`
        )
      )
        reason = 'cross-feature dependency is not approved';
      else if (from.startsWith('app/') && targetFeature && !publicApi)
        reason = 'app must use feature public entry points';
      if (reason) violations.push(`${from}: ${specifier} — ${reason}`);
    }
    function walk(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        check(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        check(node.arguments[0].text);
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
}
await visitDirectory(root);
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else console.info('Module boundaries passed.');
