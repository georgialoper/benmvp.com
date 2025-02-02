---
date: 2021-11-14
title: 'TypeScript React props: interfaces vs type aliases'
shortDescription: A practical breakdown of when to use interfaces versus types when defining  TypeScript object types such as React prop types
category: TypeScript
tags: [react, props, interface, type]
hero: ./fighting-kangaroos-jeremy-bezanger-LW1fQ6Rtw5s-unsplash.jpeg
heroAlt: Two kangaroo fighting each other
heroCredit: 'Photo by [Jeremy Bezanger](https://unsplash.com/@jeremybezanger)'
---

The first lesson in my [TypeScript for React Developers minishop](/minishops/typescript-for-react-developers/) is how to define the type of the `props` object passed to React component functions. And usually there will be someone who's already dabbled in TypeScript who asks me why I choose to use an `interface` instead of a `type` alias for defining the props. The short answer is that **interfaces and type alias are effectively interchangeable for defining objects in TypeScript.**

My assumption is that interfaces and type aliases used to have more differences between them, but as TypeScript has evolved they've both received upgrades to the point where they are now seemingly identical. The original TypeScript docs [suggested using an `interface`](https://www.typescriptlang.org/docs/handbook/advanced-types.html#interfaces-vs-type-aliases) over a `type` alias when possible, so that's what I've always done. But there are some nuances when one may make sense over the other. Instead of focusing on the technical differences, I want to spend this post focusing on the practical times we would use one over the other.

---

## Situations for both

Let's quickly take a look at the common situations where interfaces and type aliases work the exact same.

First, both can be used to define an object type.

```ts
interface ButtonProps {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}

type ButtonProps = {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}
```

Both can merge or extend other object types as well.

```ts
// include `ElementStylingProps` by interface extending

interface ElementStylingProps {
  className?: string
  style?: React.CssProperties
}
// highlight-next-line
interface ButtonProps extends ElementStylingProps {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}

// include `ElementStylingProps` by type intersection

type ElementStylingProps = {
  className?: string
  style?: React.CssProperties
}
// highlight-next-line
type ButtonProps = ElementStylingProps & {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}
```

In case you were wondering, an `interface` can also extend an object type defined by a `type` alias and vice versa.

```ts
// include `ElementStylingProps` by interface extending

type ElementStylingProps = {
  className?: string
  style?: React.CssProperties
}
// highlight-next-line
interface ButtonProps extends ElementStylingProps {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}

// include `ElementStylingProps` by type intersection

interface ElementStylingProps {
  className?: string
  style?: React.CssProperties
}
// highlight-next-line
type ButtonProps = ElementStylingProps & {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}
```

Both can even use [generic types](https://www.typescriptlang.org/docs/handbook/2/generics.html).

```ts
interface AsProp<C extends React.ElementType> {
  /**
   * An override of the default HTML tag
   * (can also be another React component)
   */
  as?: C
}

type AsProp<C extends React.ElementType> = {
  /**
   * An override of the default HTML tag
   * (can also be another React component)
   */
  as?: C
}
```

These are the common cases in which we define types for objects, especially React prop types. So 95%+ of the time\* either one works fine. And like I mentioned, the TypeScript docs suggested using an `interface` by default, so that's what I would use in all of these cases over a type alias.

## Situations for `type` aliases

The situations necessitating `type` alias are generally for more complex prop relationships.

Let's take the example explained in the [Conditional React props with TypeScript](https://www.benmvp.com/blog/conditional-react-props-typescript/) post where we have a `Text` component that allows for the text to be truncated with a `truncate` prop. And when the text is truncated there is also a `showExpanded` prop to include a "show expanded" button that will allow the truncated text to be expanded to the full text. Therefore the `showExpanded` prop only makes sense when the `truncate` prop is true.

```ts
// `TruncateProps` is a discriminated union of 2
// object types
type TruncateProps =
  // `showExpanded` cannot be set when `truncate`
  // is `false` (or `undefined`)
  | { truncate?: false; showExpanded?: never }

  // `showExpanded` can be set when `truncate`
  // is `true`
  | { truncate: true; showExpanded?: boolean }
```

When `truncate` is `false` (or `undefined`), `showExpanded` is `never` (i.e. it cannot be set). But when `truncate` is `true`, `showExpanded` can optionally be set. This type definition is what's called a [discriminated union](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions), where `TruncateProps` is either one object type or another. **A discriminated union cannot be expressed using an `interface`.** At least not yet. 😉 We have to use a `type` alias.

Similarly, if we want to take `TruncateProps` and merge it with our main props, we also need to use type intersection with a `type` alias.

```ts
// Can only use type intersection to
// extend a discriminated union
type TextProps = TruncateProps & {
  children: React.ReactNode
}
```

**We have to use a `type` alias to extend a discriminated union.** If we tried to use `extends` in an `interface`, we get an error.

```ts
interface TextProps extends TruncateProps {
  children: React.ReactNode
}

// 🛑🛑🛑 Error!!!
// An interface can only extend an object type or intersection
// of object types with statically known members.
```

When using the [TypeScript utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html) (like `Omit<>` or `Record<>`) or other custom generic types, I exclusively use `type` aliases.

```ts
interface ButtonProps {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}

// type aliases create "type expressions" when
// combined with generic types
// highlight-start
type OptionalButtonProps = Partial<ButtonProps>
type ButtonLayoutProps = Pick<ButtonProps, 'size' | 'width'>
// highlight-end
```

We can actually use interfaces as well by extending the type returned by the generic.

```ts
interface ButtonProps {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}

// interfaces *can* extend generic types but feel weird
// 🤮🤮🤮
// highlight-start
interface OptionalButtonProps extends Partial<ButtonProps> {}
interface ButtonLayoutProps extends Pick<ButtonProps, 'size' | 'width'> {}
// highlight-end
```

But in my opinion, this feels rather clunky. We're really just trying to name the result of the "type expressions as I call them. We're not extending anything. So a `type` alias is better suited for these cases in my opinion.

---

## Situations for `interface`s

So we've seen situations were interfaces are preferred by default, but `type` aliases can also work. And then situations where interface don't work. Are there also situations were _only_ interfaces work? Well, kinda. The hint comes from this cryptic sentence in the [TypeScript docs](https://www.typescriptlang.org/docs/handbook/2/objects.html#interfaces-vs-intersections):

> With interfaces, we could use an extends clause to extend from other types, and we were able to do something similar with intersections and name the result with a type alias. **The principle difference between the two is how conflicts are handled, and that difference is typically one of the main reasons why you’d pick one over the other between an interface and a type alias of an intersection type.**

And that's all it says! It doesn't actually explain how the conflicts are handled in either case. But luckily for us, we're about to see them for ourselves.

Let's say we want to define `NumberButtonProps` which are just like our `ButtonProps` except that the `children` is a `number` type instead of a `string` type. We can define `NumberButtonProps` using an `interface` that `extends` `ButtonProps` to override the `children` prop.

```ts
interface ButtonProps {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}
// highlight-start
interface NumberButtonProps extends ButtonProps {
  // should override `string` from `ButtonProps`
  children: number
}
// highlight-end
// NumberButtonProps['children'] -> `number`
```

The type of the `children` property in `NumberButtonProps` is `number`, which is exactly what we want. But what happens if we try to use an intersection with a `type` alias instead?

```ts
interface ButtonProps {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}
// highlight-start
type NumberButtonProps = ButtonProps & {
  // intersecting doesn't work how we'd expect 😔
  children: number
}
// highlight-end
// NumberButtonProps['children'] -> `never`
// (`string & number` -> `never`)
```

The type of the `children` property is now [`never`](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#the-never-type). But why? Well it turns out that when using intersections with `type` aliases, properties aren't overridden. They are... intersected. So instead of `number` overriding the original `string`, `number` is intersected with `string` (`string & number`). And because there is no shared type between `string` and `number`, the resulting type is `never`! 🤯

There may be a case where we do want a redefined property to intersect like this instead of override like with `interface`. And depending on what the types we're intersecting, they may still result in a usable type (for instance `ReactNode & number` is a `number` because the [definition of `ReactNode`](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/c22ef8d565d42e0148c036e399bed8d6c6d08781/types/react/index.d.ts#L232-L240) includes `number`). But in general, **intersecting with `type` aliases to override an existing property doesn't work.** And I now see why the TypeScript docs' explanation was so cryptic. 😅

There is a workaround for this, however. Before intersecting the redefined property we can omit it.

```ts
interface ButtonProps {
  children: string
  size?: 'small' | 'large'
  variant?: 'primary' | 'secondary'
  width?: 'fixed' | 'fit' | 'fill'
}
// omit `children` from `ButtonProps` first so that
// intersecting "overrides"
// highlight-start
type NumberButtonProps = Omit<ButtonProps, 'children'> & {
  children: number
}
// highlight-end
// NumberButtonProps['children'] -> `number`
```

By using [`Omit<>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys), the `children` prop is no longer in the object type intersected with the type that's overriding `children` as a `number`. As a result, we get the appearance of an override like with `interface`.

In my [Polymorphic React Components in TypeScript](/blog/polymorphic-react-components-typescript/) post, I use this `Omit<>` pattern because I knew that property name collisions were causing a problem, but I didn't understand why. Now almost exactly a year later, I know why! 🎉

---

I'm excited because now I have a post I can send folks to when they ask me about `interface` versus `type` alias. And I feel that I understand the nuances between them better as well.

But I'm still sticking to my guidelines. I use `interface` by default, extending them as much as possible. However, I use `type` aliases for type expressions with generics. But what this whole post has shown is that it _really_ doesn't matter which one we choose, except for some extra corner cases.

What are your practices for using `interface` and `type` aliases in TypeScript? Have you found other cases where you must use one over the other? Reach out to me on Twitter at [@benmvp](https://twitter.com/benmvp) because I'd love to know!

Keep learning my friends. 🤓
