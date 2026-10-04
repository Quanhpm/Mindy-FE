# Prompt 6 — Real student cart

Implemented product `/cart` and public `AddToCartButton` consumed by Prompt 5's
course/class screens. The integration follows the real cart controller, DTO,
CartService, ClassOffersService and commerce/enrollment exceptions in BE
`feat(api)/booking-sprint` at `577af2f`.

| Method | Path after `/api/v1` | Contract |
| --- | --- | --- |
| GET | `/me/cart` | `{ items: CartItem[], totalAmount }`, current STUDENT owner |
| POST | `/me/cart/items` | Only `{ classId }`; 201 CartDto |
| DELETE | `/me/cart/items/:classId` | No body; 204 |

CartItem fields are classId/classCode/className/courseId/courseTitle/deliveryMode,
date-only startDate/endDate, priceSnapshot/currentPriceAmount/isPurchasable/addedAt.
Runtime schemas validate dates, UUIDs, integer VND amounts, no duplicate class IDs
and at most 20 items. Add payload accepts only a v4 classId; no owner, price or
quantity field is sent. Each item is one seat; the UI offers no quantity controls.
The rendered total always reads `totalAmount` from BE, and each item shows its
current price and the price snapshot from when it was added.

`isPurchasable` is the BE course-active/class-open/end-date flag. It does not encode
remaining capacity or the student's held/enrolled seats. The UI shows unavailable
items and disables checkout until those are removed, while explaining that price
and seats are checked again when creating an order. It never claims that adding
a class holds its seat or completes payment. The CTA points to real `/checkout`.

Cart/add components use the approved auth/client dependency, shared
`canPurchaseClasses` permission and session bootstrap. Anonymous public buttons
link to `/login?next=` through safeReturnTo; non-STUDENT users make no cart requests.
Full/unavailable public classes display a disabled action and reason even for
anonymous users. Session errors offer session reload.

There is no provider, global cart cache, browser persistence, token storage or
UI Lab fixture reuse. The cart page and add button state are keyed by user ID;
in-flight requests are aborted when their owner component unmounts, preventing
late responses from displaying a previous account's cart. Requests read the
same-origin adapter with the existing no-store/auth recovery policy.

Every add/remove mutation performs an authoritative GET afterward, including
conflicts and network failures. Actual duplicate/full/unavailable/already-enrolled/
limit errors receive Vietnamese feedback. Network/server failure is described as
an unknown mutation result and is never automatically replayed. An add whose
refetch also fails is blocked until the user retries the GET. Failed delete
refetches hide uncertain cart data and offer a read retry. Mutations have a
synchronous in-flight guard and disable duplicate submission.

Public client API consumed by catalog/orders:

```ts
AddToCartButton({ classId, returnTo, disabled?, unavailableReason? })
CartPage()
getCart(signal?: AbortSignal): Promise<Cart>
announceCartChanged(): void
type Cart = { items: CartItem[]; totalAmount: number }
```

`announceCartChanged` sends a payload-free local `mindy:cart-changed` event;
mounted cart UI performs its own authenticated read. It carries no private data.
Checkout calls it after creating orders; cart refetches on route remount regardless.

Ocean Editorial presentation uses the existing product shell/Brand/Icon/tokens:
editorial heading and divider, class rows at left, soft summary at right, and one
column with summary after the list on mobile. Error/loading/empty/success states,
semantic links/buttons, visible keyboard focus and date-only formatting are present.

Checks completed by the Prompt 6 agent:

- Seven unit tests passed (four schema/display and three API boundary tests).
- Scoped Biome and module boundaries passed.
- Source type-check has no cart errors; combined `tsc --noEmit` was blocked only
  by stale `.next/dev/types` versus `.next/types` route layouts while other agents
  added public routes. Root owns final typegen/build verification.
- Six Playwright mock scenarios were added for current/snapshot totals and deletion,
  duplicate adds, lost POST/DELETE responses with no replay, owner/logout cleanup,
  role denial and safe anonymous return. First scenario checks 1440/768/390/375px
  overflow and keyboard deletion, and writes `mock-cart-1440.png` and
  `mock-cart-390.png` under `docs/implement_phase/screenshots/`. Root runs the
  coordinated combined build/E2E; these are mock checks, not live smoke.

Live cart/backend smoke was not run by this agent. No backend business/migration
edits, database seeding/reset, commit, push, merge or deployment were performed.

## Final combined verification — 2026-10-02

Root `pnpm check` passed with pinned Node 22.20.0/pnpm 12.6.0, 109 unit tests and
production build. Full mocked Chromium suite: 43 passed, including all 6 cart scenarios.
Viewed 1440/390 captures after correcting full-page scroll capture; mobile stacks
summary after items. Responsive 1440/768/390/375 and keyboard removal passed.
Earlier pending browser/build notes are superseded by this evidence. Live BE remains
unverified; see [combined report](./IMPLEMENTATION_PROMPTS_5_8.md).
