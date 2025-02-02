---
date: 2021-08-15
title: Forwarding refs for a polymorphic React component in TypeScript
shortDescription: How to properly type polymorphic React components using forwardRef in TypeScript
category: TypeScript
tags: [react, typescript, refs, polymorphic]
hero: ./you-are-here-fallon-michael-VUWDlBXGogg-unsplash.jpeg
heroAlt: You are Here with boots in black & white
heroCredit: 'Photo by [Fallon Michael](https://unsplash.com/@fallonmichaeltx)'
---

Late last year I wrote about how to develop [Polymorphic React Components in TypeScript](/blog/polymorphic-react-components-typescript/). Polymorphic components are one of the [React component patterns](/blog/picking-right-react-component-pattern/) that enable us to create reusable and extendable components without having to rewrite display/layout, visual look-and-feel, and/or UI logic.

The implementation from that post, however, didn't discuss how to properly type a polymorphic component in TypeScript when it supports a ref using [`forwardRef()`](https://reactjs.org/docs/forwarding-refs.html). That was an additional wrinkle that my team needed and figured out later. So let's talk about it now.

Just so we're all on the same page, here's our polymorphic `Text` component in TypeScript (including the helper types):

```typescript
import React from 'react'

// Source: https://github.com/emotion-js/emotion/blob/master/packages/styled-base/types/helper.d.ts
// A more precise version of just React.ComponentPropsWithoutRef on its own
export type PropsOf<
  C extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>
> = JSX.LibraryManagedAttributes<C, React.ComponentPropsWithoutRef<C>>

type AsProp<C extends React.ElementType> = {
  /**
   * An override of the default HTML tag.
   * Can also be another React component.
   */
  as?: C
}

/**
 * Allows for extending a set of props (`ExtendedProps`) by an overriding set of props
 * (`OverrideProps`), ensuring that any duplicates are overridden by the overriding
 * set of props.
 */
export type ExtendableProps<
  ExtendedProps = {},
  OverrideProps = {}
> = OverrideProps & Omit<ExtendedProps, keyof OverrideProps>

/**
 * Allows for inheriting the props from the specified element type so that
 * props like children, className & style work, as well as element-specific
 * attributes like aria roles. The component (`C`) must be passed in.
 */
export type InheritableElementProps<
  C extends React.ElementType,
  Props = {}
> = ExtendableProps<PropsOf<C>, Props>

/**
 * A more sophisticated version of `InheritableElementProps` where
 * the passed in `as` prop will determine which props can be included
 */
export type PolymorphicComponentProps<
  C extends React.ElementType,
  Props = {}
> = InheritableElementProps<C, Props & AsProp<C>>

// 👇🏾👇🏾 sample usage in `Text` component 👇🏾👇🏾

interface Props {
  children: React.ReactNode
  color?: Color
  font?: 'thin' | 'regular' | 'heavy'
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
}

type TextProps<C extends React.ElementType> = PolymorphicComponentProps<
  C,
  Props
>

export const Text = <C extends React.ElementType = 'span'>({
  as,
  children,
  font = 'regular',
  size = '4',
  color = 'gray-40',
  ...other
}: TextProps<C>) => {
  const classes = getClasses({ font, size, color })
  const Component = as || 'span'

  return (
    <Component {...other} className={classes}>
      {children}
    </Component>
  )
}
```

> If you're not quite sure how all of this works, read [Polymorphic React Components in TypeScript](/blog/polymorphic-react-components-typescript/) first for a step-by-step explanation.

When using [`forwardRef()` generic function in TypeScript](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/2dfb801ec978b29ab81690a9b24ecb1f06c4eaf2/types/react/index.d.ts#L804) with a non polymorphic component, we pass in the type of the ref with the function call. Let's pretend our `Text` component is a simple component that always renders a `<span>`, so the type of the `ref` is `HTMLSpanElement`.

```typescript
// highlight-next-line
export const Text = React.forwardRef<HTMLSpanElement, TextProps>(
  ({ children, font = 'regular', size = '4', color = 'gray-40' }, ref) => {
    const classes = getClasses({ font, size, color })

    return (
      // highlight-next-line
      <span ref={ref} className={classes}>
        {children}
      </span>
    )
  },
)
```

When defining a polymorphic component, we need to replace `HTMLSpanElement` with our `C` generic type, but we can't. **The problem is that `forwardRef()` is a function call so there's no opportunity to define the generic `C` type to pass to it.** We could wrap `forwardRef()` in a function call, a component generator of sorts. But then we would no longer have the component interface and couldn't use JSX directly.

So here's what we came up with.

First we defined a new helper type, `PolymorphicRef`, that returns the type of the ref for the polymorphic component.

```typescript
export type PolymorphicRef<
  C extends React.ElementType
> = React.ComponentPropsWithRef<C>['ref']
```

We can then use this type in our call to `forwardRef()` to avoid passing in the types to the function call. Instead we declare the types of the individual function parameters.

```typescript
// highlight-range{10-11,17}
export const Text = React.forwardRef(
  <C extends React.ElementType = 'span'>(
    {
      as,
      children,
      font = 'regular',
      size = '4',
      color = 'blue',
      ...other
    }: TextProps<C>,
    ref?: PolymorphicRef<C>,
  ) => {
    const classes = `${color} ${font} ${size}`
    const Component = as || 'span'

    return (
      <Component {...other} className={classes} ref={ref}>
        {children}
      </Component>
    )
  },
)
```

So this works in that everything within the component code is strongly typed. But the type of `Text` itself is `any` 😭. So after trying and trying and trying, we gave in and explicitly defined the type for `Text` (now including a ref) using a [type annotation](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-annotations-on-variables).

```typescript
// highlight-start
type TextComponent = <C extends React.ElementType = 'span'>(
  props: TextProps<C>,
) => React.ReactElement | null
// highlight-end

// highlight-next-line
export const Text: TextComponent = React.forwardRef(
  <C extends React.ElementType = 'span'>(
    {
      as,
      children,
      font = 'regular',
      size = '4',
      color = 'blue',
      ...other
    }: TextProps<C>,
    ref?: PolymorphicRef<C>,
  ) => {
    const classes = `${color} ${font} ${size}`
    const Component = as || 'span'

    return (
      <Component {...other} className={classes} ref={ref}>
        {children}
      </Component>
    )
  },
)
```

`TextComponent` (naming is hard lol) is a function that takes in `TextProps` and returns JSX. In other words, it's a component. This _almost_ gets us there, except now `Text`, from a type perspective, doesn't support a `ref` prop even though from a code perspective it does. 🤦🏾‍♂️ **So the final step was to update `TextProps` to now support the `PolymorphicRef`.**

```typescript
// highlight-start
export type PolymorphicComponentPropsWithRef<
  C extends React.ElementType,
  Props = {}
> = PolymorphicComponentProps<C, Props> & { ref?: PolymorphicRef<C> }
// highlight-end

interface Props {
  children: React.ReactNode
  color?: 'red' | 'green' | 'blue'
  font?: 'thin' | 'regular' | 'heavy'
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
}

// highlight-next-line
type TextProps<C extends React.ElementType> = PolymorphicComponentPropsWithRef<
  C,
  Props
>

type TextComponent = <C extends React.ElementType = 'span'>(
  props: TextProps<C>,
) => React.ReactElement | null
```

This introduces a new helper type called `PolymorphicComponentPropsWithRef` which adds the `PolymorphicRef` to the `Props` so that we can create `TextProps`. We could've made the base `PolymorphicComponentProps` support refs by default (see the `PropsOf` helper). But we were incrementally supporting refs in components, so we needed the separation.

So altogether the new `Text` component with all its reusable helper types looks like (new code highlighted):

```typescript
import React from 'react'

// Source: https://github.com/emotion-js/emotion/blob/master/packages/styled-base/types/helper.d.ts
// A more precise version of just React.ComponentPropsWithoutRef on its own
export type PropsOf<
  C extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>
> = JSX.LibraryManagedAttributes<C, React.ComponentPropsWithoutRef<C>>

type AsProp<C extends React.ElementType> = {
  /**
   * An override of the default HTML tag.
   * Can also be another React component.
   */
  as?: C
}

/**
 * Allows for extending a set of props (`ExtendedProps`) by an overriding set of props
 * (`OverrideProps`), ensuring that any duplicates are overridden by the overriding
 * set of props.
 */
export type ExtendableProps<
  ExtendedProps = {},
  OverrideProps = {}
> = OverrideProps & Omit<ExtendedProps, keyof OverrideProps>

/**
 * Allows for inheriting the props from the specified element type so that
 * props like children, className & style work, as well as element-specific
 * attributes like aria roles. The component (`C`) must be passed in.
 */
export type InheritableElementProps<
  C extends React.ElementType,
  Props = {}
> = ExtendableProps<PropsOf<C>, Props>

/**
 * A more sophisticated version of `InheritableElementProps` where
 * the passed in `as` prop will determine which props can be included
 */
export type PolymorphicComponentProps<
  C extends React.ElementType,
  Props = {}
> = InheritableElementProps<C, Props & AsProp<C>>

// highlight-start
/**
 * Utility type to extract the `ref` prop from a polymorphic component
 */
export type PolymorphicRef<
  C extends React.ElementType
> = React.ComponentPropsWithRef<C>['ref']

/**
 * A wrapper of `PolymorphicComponentProps` that also includes the `ref`
 * prop for the polymorphic component
 */
export type PolymorphicComponentPropsWithRef<
  C extends React.ElementType,
  Props = {}
> = PolymorphicComponentProps<C, Props> & { ref?: PolymorphicRef<C> }
// highlight-end

// 👇🏾👇🏾 sample usage in `Text` component 👇🏾👇🏾

interface Props {
  children: React.ReactNode
  color?: Color
  font?: 'thin' | 'regular' | 'heavy'
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
}

// highlight-next-line
type TextProps<C extends React.ElementType> = PolymorphicComponentPropsWithRef<
  C,
  Props
>

// highlight-start
type TextComponent = <C extends React.ElementType = 'span'>(
  props: TextProps<C>,
) => React.ReactElement | null
// highlight-end

// highlight-next-line
export const Text: TextComponent = React.forwardRef(
  <C extends React.ElementType = 'span'>(
    {
      as,
      children,
      font = 'regular',
      size = '4',
      color = 'blue',
      ...other
    }: TextProps<C>,
    // highlight-next-line
    ref?: PolymorphicRef<C>,
  ) => {
    const classes = `${color} ${font} ${size}`
    const Component = as || 'span'

    return (
      // highlight-next-line
      <Component {...other} className={classes} ref={ref}>
        {children}
      </Component>
    )
  },
)
```

Now when we render a `<Text>` component, if the `as` prop is `"label"`, not only does `<Text>` support the `ref` prop, but its type has to be `HTMLLabelElement` (or the generic `HTMLElement`). Type checking will fail when passing other types. 🎉

---

The types are still abstracted well enough that the definition of the `Text` component itself isn't overly complex. I just really wished we could avoid the explicit type annotation. I'm hoping this can be improved if/when the React team builds `forwardRef()` directly into function components.

If you have found a way around it or have found another solution for forwarding refs for polymorphic React components in TypeScript, I'd love to hear it! Feel free to reach out to me on Twitter at [@benmvp](https://twitter.com/benmvp).

Keep learning my friends. 🤓
