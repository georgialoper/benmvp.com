---
date: 2021-01-31
title: Prettier + ESLint = ❤️
shortDescription: How to integrate Prettier into ESLint so that you'll never have to think of code formatting again!
category: DivOps
tags: [divops, githooks, vscode]
hero: ./makeup-element5-digital-ceWgSMd8rvQ-unsplash.jpg
heroAlt: Assorted makeup products
heroCredit: 'Photo by [Element5 Digital](https://unsplash.com/@element5digital)'
---

A little over a year ago, I found a Prettier setup that works really well for me. [Prettier](https://prettier.io/) is a highly-opinionated code formatter intended to remove discussions about code style in code reviews. By default, we run `prettier --write` by itself and it formats our code. But if you also have [ESLint](https://eslint.org/) (a JavaScript linter) in your tool chain, things can get tricky.

ESLint already has some style rules, so when we run [`eslint --fix`](https://eslint.org/docs/user-guide/command-line-interface#-fix), it auto-formats our code as well. I started off using the [`prettier-eslint`](https://github.com/prettier/prettier-eslint) package which would first run `prettier` and then run `eslint`. It worked okay, but then I stumbled across [`eslint-plugin-prettier`](https://github.com/prettier/eslint-plugin-prettier) and it has seemed to work out quite smoothly.

Instead of running `prettier` as a separate command, **`eslint-plugin-prettier` runs Prettier as an ESLint rule**, reporting anything incorrectly formatted as an ESLint error.

```
/path/to/locations.ts
  31:35  error  Replace `·?·toFull(LOCATIONS_LOOKUP[location.parentId])`
    with `⏎····?·toFull(LOCATIONS_LOOKUP[location.parentId])⏎···`
    prettier/prettier

✖ 1 problem (1 error, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.
```

At first, this would seem more annoying. Who wants to manually format code to adhere to Prettier? But it's the last line of the ESLint error that's key. **All of the Prettier formatting errors are all auto-fixable**, so running `eslint --fix` not only auto-fixes regular ESLint rules, but also formats our code (Prettier-style).

## Setup

So assuming we've already [set up ESLint](https://eslint.org/docs/user-guide/getting-started), we first install `prettier`, `eslint-plugin-prettier` and [`eslint-config-prettier`](https://github.com/prettier/eslint-config-prettier):

```sh
npm install --save-dev prettier eslint-plugin-prettier eslint-config-prettier
```

While Prettier is highly opinionated, it does allow for some configuration inside a [`.prettierrc` file](https://prettier.io/docs/en/configuration.html):

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all"
}
```

Lastly, in our `.eslintrc.json`, we extend the recommended configuration:

```json
{
  "extends": [
    "react-app",
    "react-app/jest",
    // highlight-next-line
    "plugin:prettier/recommended",
    "prettier/@typescript-eslint",
    "prettier/react"
  ]
}
```

The `plugin:prettier/recommended` extends the `eslint-config-prettier` which turns off a [handful of rules](https://github.com/prettier/eslint-config-prettier#special-rules) from our base config that are unnecessary or might conflict with Prettier. We typically have a base config, like [`eslint-config-airbnb`](https://www.npmjs.com/package/eslint-config-airbnb) or [`eslint-config-react-app`](https://www.npmjs.com/package/eslint-config-react-app) (used in the example above), that makes some code styling decisions. **So `eslint-config-prettier` turns off those rules so Prettier can play nice.** The `plugin:prettier/recommended` also turns on the single `prettier/prettier` rule that validates code format using Prettier.

When developing in React, we use [`eslint-plugin-react`](https://github.com/yannickcr/eslint-plugin-react) for React-specific ESLint rules. There are some rules within it that also conflict with Prettier, so `eslint-config-prettier` provides an additional React-specific config to extend from that removes those conflicting rules.

```json
{
  "extends": [
    "react-app",
    "react-app/jest",
    "plugin:prettier/recommended",
    // highlight-start
    "prettier/@typescript-eslint",
    "prettier/react"
    // highlight-end
  ]
}
```

In the above example, I've added additional exclusion configs for both TypeScript (`"prettier/@typescript-eslint"`) and React (`"prettier/react"`). Check out [the full list of exclusions](https://github.com/prettier/eslint-config-prettier#installation).

The `eslint-config-prettier` does its best to remove all conflicting rules, but we also have to use common sense. We'll need to let go of these ideals for what is "good" code style and accept Prettier's formatting decision. That's the whole point; to **save time and mental energy by no longer dealing with code formatting**. In the end, how the code is formatted really doesn't matter. The object is consistency, not following your preference. 😉

## Editor extensions

I've now lost track of how long I've been using [Visual Studio Code](https://code.visualstudio.com/). I am many years into my "two week trial." 😅 Honestly, I wouldn't be nearly as excited about Prettier if it weren't for the [VS Code Prettier Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode). With the extension installed, I configure VS Code to format files using Prettier every time I save them.

I cannot understate how transformational this is. **I never have to worry about spacing, indentations, semi-colons or anything.** I pretty much just "vomit" out the code on one long line, hit Save, and the code is pretty. It isn't until I work on a codebase that doesn't have Prettier, that I realize how much time and mental energy it saves me.

In addition, **Prettier also indirectly informs me when there's a syntax error in my code**. Rarely, if ever, do I write perfectly formatted code. So every time I save, there is some visual code shift. So if I save the code, and nothing formats, I know there's a syntax error in the code somewhere before even executing the code. Bonus feature!

I still use the [VS Code ESLint Extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) as well to show ESLint errors inline. It also shows errors when code isn't formatted properly because of `eslint-plugin-prettier`. But I don't find it distracting much.

## Git hooks

Because we presumably are already running ESLint in a continuous integration (CI) environment, we're now assured that our code will be consistently formatted across our team because Prettier formatting is now an ESLint rule. But it kinda sucks to have CI fail because of style decisions. That's what Prettier is trying to avoid. And if your CI runs take minutes, having it fail because of formatting will be _very_ frustrating.

Those of us with the editor integrations are fine because we're formatting whenever we're saving our code. But those on our team that maybe go in and out of the frontend, likely won't have the same wonderful setup. And they probably care about the code formatting the least as well. **So them having to push new commits because CI is failing because of incorrectly formatted code will cause lots of team friction.**

The best way to avoid this problem is having everyone's code auto-formatted whenever they commit code using [git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks). Raw git hooks are kind of gnarly to set up, but [`husky`](https://www.npmjs.com/package/husky) has abstracted away all of the tricky bits.

The combination of it and [`lint-staged`](https://www.npmjs.com/package/lint-staged) takes care of what we're trying to accomplish. We can install and configure them both by running:

```shell
npx mrm lint-staged
```

Because we've already installed `eslint` and `prettier`, in addition to installing `lint-staged` and `husky`, the command will also configure them both within our `package.json`.

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.js": "eslint --cache --fix",
    "*.{js,css,md}": "prettier --write"
  }
}
```

The `"husky"` configuration will run `lint-staged` on pre-commit, which is what we want. And then by default `lint-staged` will run `eslint --fix` on JavaScript files and `prettier` on JavaScript, CSS and Markdown files. It's worth mentioning that Prettier works on all sorts of code, not just JavaScript.

The configuration script doesn't recognize our prettier-as-an-eslint-rule setup, which is why it adds the additional `prettier` step. So let's remove the last line:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.js": "eslint --cache --fix"
  }
}
```

**Now our co-workers can write their code however they like, and it will all get auto-formatted behind the scenes** before making it to their pull request. We get a consistently formatted codebase and they don't have to deal with the frustration of fixing formatting errors.

This setup also has the added benefit of giving quicker feedback for other `eslint` errors that aren't auto-fixable. The commits won't go through with ESLint errors. So we (and our co-workers) can know about the errors before we commit them instead of after we a CI failure. No more `Fix eslint errors` commits. 😄

Keep learning my friends. 🤓
