# Contributing to LX Family Planner

The best contribution is not the longest feature list. It is a change that
makes everyday family life easier without weakening privacy, reliability or the
role-specific experience.

## What a good contribution protects

- child profiles and private family data;
- desktop, phone and tablet layouts;
- adults, children, grandparents, managed profiles and pets;
- existing data and settings during updates;
- plain-language setup and error messages.

## Local development

```bash
git clone https://github.com/laxxx-lab/lx-family-planner.git
cd lx-family-planner
npm ci
cp .env.example .env
npm run server
```

Run `npm run dev` in a second terminal. Before opening a pull request:

```bash
npm run check
```

## Pull requests

1. Open an issue before a large or cross-cutting change.
2. Keep the branch and pull request focused.
3. Test visible changes on desktop and mobile.
4. Consider every role and server-side permission, not only hidden buttons.
5. Add a migration/update test when stored data changes.
6. Do not include real names, photos, messages, server addresses or secrets.
7. Add or update both English and German translation keys for visible text.

For visible changes, include before/after screenshots with personal details
removed. Automated or AI-assisted contributions are welcome, but the author is
responsible for understanding, testing and reviewing the submitted result.

German version: [CONTRIBUTING.de.md](CONTRIBUTING.de.md)
