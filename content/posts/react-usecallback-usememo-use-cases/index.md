---
date: 2021-10-10
title: React useCallback & useMemo use cases
shortDescription: Examples for when using the useCallback and useMemo React Hooks are helpful in reducing component re-renders
category: React
tags: [react, hooks, usecallback, useMemo, performance]
hero: ./us-currency-bills-alexander-schimmeck-H_KabGs8FMw-unsplash.jpeg
heroAlt: Various denominations of U.S. paper notes
heroCredit: 'Photo by [Alexander Schimmeck](https://unsplash.com/@alschim)'
---

I went a long while writing React with Hooks without using the [`useCallback()`](https://reactjs.org/docs/hooks-reference.html#usecallback) or [`useMemo()`](https://reactjs.org/docs/hooks-reference.html#usememo) Hooks. And even now I still hardly use `useMemo()`. So that's all to say that we can build perfectly fine React applications without knowing or using either Hook.

However, I'm frequently asked to explain when and why we would use `useCallback()` or `useMemo()` so I figured I might as well take some time to explain when I use them most frequently. Pretty much it comes down to maintaining [referential (strict) equality](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness) in the dependencies of Hooks, or avoiding recalculating expensive computations.

---

## `useCallback()`

I've written a number of React posts about custom Hooks that have used [`useCallback()`](https://reactjs.org/docs/hooks-reference.html#usecallback) in their code:

- [8 helpful custom React Hooks](/blog/8-helpful-custom-react-hooks/)
- [Creating a React controlled components pattern custom Hook](/blog/create-react-controlled-components-pattern-custom-hook/)
- [Handling async React component effects after unmount](/blog/handling-async-react-component-effects-after-unmount/)
- [Sync to localStorage with React useReducer Hook](/blog/sync-localstorage-react-usereducer-hook/)
- [Copy to clipboard React custom Hook](/blog/copy-to-clipboard-react-custom-hook/)
- [Helper functions in the React useEffect hook](/blog/helper-functions-react-useeffect-hook/)

(just to name a few 😉)

The last post gives the option of using `useCallback()` when we have an internal helper function that needs to be used within `useEffect()`.

```js
const Example = () => {
  const [count, setCount] = useState(0)
  const [showMessage, setShowMessage] = useState(true)

  // inner helper function that will be called w/in `useEffect()`
  // highlight-start
  const hideMessage = () => {
    if (count < 10) {
      setShowMessage(false)
    }
  }
  // highlight-end

  useEffect(() => {
    window
      .fetch('https://api.benmvp.com/')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // ⚠️ not including `hideMessage()` in the dependencies of
          // `useEffect()` is a lurking bug and will trigger the
          // `react-hooks/exhaustive-deps` ESLint rule
          // highlight-next-line
          hideMessage()
        }
      })
    // highlight-next-line
  }, [])

  return (
    <div>
      {showMessage && <p>You clicked {count} times</p>}
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  )
}
```

You should totally read through the post if you want to fully understand the problem. But because `hideMessage()` is defined _within_ the `Example` component, **we can't just add it to the dependencies of `useEffect()` because it gets redefined with every render of `Example`.** As a result, the `useEffect()` Hook will be run on every re-render which we don't want.

You see, `useEffect()` compares the values of the items in the dependencies array before and after to see if it should re-run the effect. And for complex values like objects, arrays, or functions it uses [referential (strict) equality](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness). It uses `===` to compare each of the values before and after. And in order for a function to `===` another function, it has to be the exact same reference to the function. A re-declaration of the function will not `===`.

Wrapping `hideMessage` in `useCallback()` is one option to fix this problem.

```js
const Example = () => {
  const [count, setCount] = useState(0)
  const [showMessage, setShowMessage] = useState(true)

  // 👍🏾 The reference of `hideMessage()` will only change if/when
  // the value of `count` changes
  // highlight-start
  const hideMessage = useCallback(() => {
    if (count < 10) {
      setShowMessage(false)
    }
  }, [count])
  // highlight-end

  useEffect(() => {
    window
      .fetch('https://api.benmvp.com/')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // highlight-next-line
          hideMessage()
        }
      })
    // highlight-next-line
  }, [hideMessage])

  return (
    <div>
      {showMessage && <p>You clicked {count} times</p>}
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  )
}
```

**We can basically think of `useCallback()` as a cache of sorts.** If it's given the same `count` value, it'll give us back the same function reference. Therefore if we re-render `Example` and `count` does not change, we'll continue to receive the same exact reference for the `hideMessage` function. This in turn means that we won't re-run the `useEffect()`, which is our ultimate goal.

In addition, because of this issue with functions in the dependencies of `useEffect()` (or even other `useCallback()` calls), when I create custom Hooks that return a function, I always wrap those in `useCallback()` as well.

```js
const useCopyToClipboard = (text, notifyTimeout = 2500) => {
  const [copyStatus, setCopyStatus] = useState('inactive')

  // Wrap `copy()` in `useCallback()` just in case.
  // It becomes a "stable" reference like `setCopyStatus()`
  // highlight-next-line
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(
      () => setCopyStatus('copied'),
      () => setCopyStatus('failed'),
    )
  }, [text])

  // reset the copy status after the `notifyTimeout` is finished
  useEffect(() => {
    if (copyStatus === 'inactive') {
      return
    }

    const timeoutId = setTimeout(() => setCopyStatus('inactive'), notifyTimeout)

    return () => clearTimeout(timeoutId)
  }, [copyStatus])

  return [copyStatus, copy]
}
```

The `useCopyToClipboard()` custom Hook provides a function that we can call to use the native [`Clipboard` API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard) as well as a string maintaining the copy status. The thing is that we don't know how the `copy()` function will be used in the host component. If it's being used within a `useEffect()` like in our previous `Example` component, it too will need to be added in the `useEffect()` dependencies.

Our `useCopyToClipboard()` custom Hook will be called every time the host component re-renders. **And if `useCopyToClipboard()` didn't wrap `copy()` in `useCallback()` it would return a new function reference every time.** And as a result, the `useEffect()` dependencies would change every time, causing it the effect to re-run every time. That's no good.

> Wrapping the `copy()` function with `useCallback()` is similar to what `useState()` does with the updater function it returns. For instance, React guarantees that `setCopyStatus()` above is a stable reference.

---

## `useMemo()`

The [`useMemo()`](https://reactjs.org/docs/hooks-reference.html#usememo) Hook is very similar to `useCallback()` except that it [memoizes](https://en.wikipedia.org/wiki/Memoization) any value, not just functions. Again, we can think of "memoization" as a cache. If we provide the same dependency values (i.e. the "cache key"), we'll get the same value back.

I would use `useMemo()` in the same situations as above w/ `useCallback()`, i.e. when I have an object or array that will end up in the dependencies of `useEffect()`.

```js
const Example = () => {
  const [filter, setFilter] = useState('')
  // `filteredPlayers` is a derived array that is
  // recomputed on every re-render of `Example`
  // highlight-start
  const filteredPlayers = ALL_PLAYERS.filter((player) =>
    player.name.includes(filter),
  )
  // highlight-end

  useEffect(() => {
    window.fetch('https://api.benmvp.com/players/update', {
      method: 'POST',
      // ⚠️ not including `filteredPlayers` in the
      // dependencies is a lurking bug and will trigger
      // the `react-hooks/exhaustive-deps` ESLint rule,
      // but including it in the deps will also cause
      // the effect to run every re-render 😭
      // highlight-next-line
      body: JSON.stringify(filteredPlayers),
    })
    // highlight-next-line
  }, [])

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
    </div>
  )
}
```

By not including `filteredPlayers` in the `useEffect()` dependencies, when it does change we won't make another POST API call, which is a bug. However, if we _do_ add it to the dependencies, every time the component re-renders, we'll make a POST API call, even if the `filteredPlayers` data actually hasn't changed. This is because `filteredPlayers` is a derived value so it's recalculated on every re-render.

By using the `useMemo()` Hook, we can "cache" the value of `filteredPlayers` for every `filter` value.

```js
const Example = () => {
  const [filter, setFilter] = useState('')
  // "cache" `filteredPlayers` on every value of `filter`
  // highlight-start
  const filteredPlayers = useMemo(
    () => ALL_PLAYERS.filter((player) => player.name.includes(filter)),
    [filter],
  )
  // highlight-end

  useEffect(() => {
    window.fetch('https://api.benmvp.com/players/update', {
      method: 'POST',
      // highlight-next-line
      body: JSON.stringify(filteredPlayers),
    })
    // now the effect will only be called when `filter` changes because
    // that's the only time the `filteredPlayers` reference will change
    // highlight-next-line
  }, [filteredPlayers])

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
    </div>
  )
}
```

So now, if `filter` remains the same, we'll get back the same array reference for `filteredPlayers`. As a result the effect will not be re-run because `filteredPlayers` is the exact same reference as the previous render. But when `filter` _does_ change, then `filteredPlayers` is recalculated and we have a new reference. As such, the effect will also be re-run.

> Just as with `useCallback()` if I am returning a derived object or array from a custom Hook, I also use `useMemo()`in order to be a "good citizen." I don't know how the object/array will be used, so for safety, I wrap it in `useMemo()`

**The other use case for `useMemo()` is to avoid expensive recalculations.** Let's say that in our example `ALL_PLAYERS` is a huge array (maybe 1000+ items). Even if we weren't using `filteredPlayers` in a `useEffect()`, re-computing that filter every time `Example` is re-rendered could be expensive and have performance impacts. So using `useMemo()` once again caches the value so it's only computed once per `filter` value.

I _rarely_ use `useMemo()` in this case, though. I have yet to run into a case where this sort of performance optimization was needed. Unless the recalculation is super duper intensive and the component is being re-render many times per second, I've found that this optimization really isn't needed. **Using `useMemo()` isn't free after all because of all the code that executes to support it.** So it can actually _hurt_ our performance when used unnecessarily.

By the way, I doubt this is how it's actually implemented in React under the hood, but we can implement `useCallback()` with `useMemo()`.

```js
const useCallback = (func, deps) => {
  return useMemo(() => {
    return func
  }, deps)
}
```

Just a little nugget of information before you go. 😄

---

I try to use the `useCallback()` and `useMemo()` Hooks only when required, i.e. when they are being used as dependencies for `useEffect()` (or other `useCallback()` or `useMemo()` calls). I hardly use them for performance optimization purposes because I hardly run into situations where it's necessary.

What other use cases do you use `useCallback()` or `useMemo()`? I'd love to hear about them so I can continue to improve my React development skills. Feel free to reach out to me on Twitter at [@benmvp](https://twitter.com/benmvp).

Keep learning my friends. 🤓
