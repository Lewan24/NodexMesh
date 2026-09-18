# Code readability

- Write and edit all project files for human readability. Follow `.prettierrc.json` and `.editorconfig`.
- Keep short expressions, calls, imports, objects and simple JSX elements on one line when they fit comfortably within 120 characters.
- Split long expressions, nested JSX, complex conditions and callbacks across clearly indented lines. Never compress multiple statements or unrelated operations onto one line just to reduce line count.
- Use 2 spaces for indentation, single quotes in JavaScript/TypeScript, semicolons and LF line endings.
- Separate logical steps with blank lines. Preserve useful comments and meaningful names.
- Preserve behavior and rendered appearance when formatting. Pay particular attention to JSX whitespace, text content, template literals and CSS.
- Do not hand-format generated files, dependency lockfiles, build output or binary assets.
- Run `npm run format` after editing supported files and `npm run format:check` before finishing. Run the existing tests and build when changing application code or formatting it across the project.
