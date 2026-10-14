# FRONTEND UI QUALITY RULE

Whenever implementing or modifying frontend UI:

1. Inspect the existing design system before coding.

2. Preserve unrelated UI.
Do not redesign parts that were not requested.

3. Reuse:
- typography
- spacing
- border radius
- color tokens
- existing components

4. Prefer existing project components.

5. Use shadcn components only when they fit the project's current design system.

6. Never conclude UI is correct only from source code.

After modifying UI:

7. Start the real application.

8. Open the modified page in a browser.

9. Test desktop sizes:
- 1920x1080
- 1440x900
- 1366x768

10. Test responsive sizes:
- 768x1024
- 390x844

11. Inspect:
- horizontal overflow
- vertical overflow
- overlapping components
- clipped text
- long Vietnamese text
- alignment
- padding
- margins
- typography
- contrast
- form labels
- buttons
- hover states
- active states
- focus states
- disabled states
- loading states
- empty states
- error states
- responsive navigation
- tables
- dialogs
- dropdowns

12. Inspect browser console.
There must be no unexplained:
- JavaScript errors
- React errors
- hydration errors
- failed resources
- accessibility-critical errors

13. If Playwright is available, use it for browser verification.

14. If Chrome DevTools is available, inspect actual DOM/CSS when layout is incorrect.

15. If a screenshot/reference design is supplied:
- compare implementation with the screenshot;
- preserve unchanged regions;
- fix visible differences iteratively.

16. Do not report PASS merely because:
- npm run build passes
- npm run lint passes
- TypeScript passes
- unit tests pass

These checks are required but do not prove visual correctness.
UI PASS requires actual browser verification.
