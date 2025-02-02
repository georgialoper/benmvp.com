---
date: 2021-10-17
title: How to extract React component logic into a custom Hook
shortDescription: Reasons and steps to follow to create React custom Hooks by extracting component logic
category: React
tags: [react, hooks]
hero: ./coat-hook-steve-johnson-6sB8gMRlEAU-unsplash.jpeg
heroAlt: Silver coat hook on white wall
heroCredit: 'Photo by [Steve Johnson](https://unsplash.com/@steve_j)'
---

[React custom Hooks](https://reactjs.org/docs/hooks-custom.html) are kind of like logic helpers for our React components, so that the components themselves can focus on rendering and user interactions. Commonly folks will extract component logic into a custom Hook when they need to reuse the logic in multiple components (such as [`useMedia`](https://github.com/streamich/react-use/blob/master/docs/useMedia.md), [`useClickAway`](https://github.com/streamich/react-use/blob/master/docs/useClickAway.md), [`useEffectOnce`](https://github.com/streamich/react-use/blob/master/docs/useEffectOnce.md), and [many others](https://github.com/streamich/react-use)). But I will also make a single-use custom Hook simply when the logic is large or complex. In my opinion, it makes it easier to reason about the logic and UI separately.

Let's say we have a hypothetical page that has a list of teams and a list of players. And at the top it has filters for both the teams and players.

```js
import { useEffect, useState } from 'react'

const Page = () => {
  const [teamsFilter, setTeamFilter] = useState('')
  const [teams, setTeams] = useState([])
  const [playersFilter, setPlayersFilter] = useState('')
  const [players, setPlayers] = useState([])

  useEffect(() => {
    // page is mounted once `useEffect()` is called
    let isMounted = true

    window
      .fetch(`https://api.benmvp.com/teams?q=${teamsFilter}`)
      .then((res) => res.json())
      .then((data) => {
        // only set state if page is still mounted
        if (isMounted) {
          setTeams(data.teams)
        }
      })

    window
      .fetch(`https://api.benmvp.com/players?q=${playersFilter}`)
      .then((res) => res.json())
      .then((data) => {
        // only set state if page is still mounted
        if (isMounted) {
          setPlayers(data.players)
        }
      })

    return () => {
      // page is no longer mounted when cleanup func is called
      isMounted = false
    }
    // makes both API calls when either filter changes 👎🏾
  }, [teamsFilter, playersFilter])

  return (
    <div>
      <TeamsFilter filter={teamsFilter} onChange={setTeamFilter} />
      <PlayersFilter filter={playersFilter} onChange={setPlayersFilter} />

      <Teams teams={teams} />
      <Players players={players} teams={teams} />
    </div>
  )
}
```

> If you're wondering about the `isMounted` check after we receive the data from the API, it's to ensure that the component wasn't unmounted during the time that we made the API request and got back the response. Read [Handling async React component effects after unmount](/blog/handling-async-react-component-effects-after-unmount/) for more details on the problem and solution.

The component makes two API requests any time the `TeamsFilter` or `PlayersFilter` change. But it's inefficient because only one filter can change at a time, yet we make requests to both APIs. So if we're changing the `TeamsFilter` we're still retrieving the same `players` data over and over. We can fix by splitting up the single `useEffect()` call into two of them.

```js
import { useEffect, useState } from 'react'

const Page = () => {
  const [teamsFilter, setTeamFilter] = useState('')
  const [teams, setTeams] = useState([])
  const [playersFilter, setPlayersFilter] = useState('')
  const [players, setPlayers] = useState([])

  // separate the teams `useEffect()` from the players one so that
  // we only retrieve data for the one that has changed

  useEffect(() => {
    let isMounted = true

    window
      .fetch(`https://api.benmvp.com/teams?q=${teamsFilter}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setTeams(data.teams)
        }
      })

    return () => {
      isMounted = false
    }
  }, [teamsFilter])

  useEffect(() => {
    let isMounted = true

    window
      .fetch(`https://api.benmvp.com/players?q=${playersFilter}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setPlayers(data.players)
        }
      })

    return () => {
      isMounted = false
    }
  }, [playersFilter])

  return (
    <div>
      <TeamsFilter filter={teamsFilter} onChange={setTeamFilter} />
      <PlayersFilter filter={playersFilter} onChange={setPlayersFilter} />

      <Teams teams={teams} />
      <Players players={players} teams={teams} />
    </div>
  )
}
```

As you can see the component is dominated by what I call the component logic. This is all the state management code: the state itself (`teams` & `players`), the API calls and updating the state (`setTeams` & `setPlayers`). So what I would probably do now is break out the teams state management code and the players state management code into their own [custom React Hooks](https://reactjs.org/docs/hooks-custom.html).

```js
import { useEffect, useState } from 'react'

// Take a filter and return the teams when we
// get the data
const useTeams = (filter = '') => {
  const [teams, setTeams] = useState([])

  useEffect(() => {
    let isMounted = true

    window
      .fetch(`https://api.benmvp.com/teams?q=${filter}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setTeams(data.teams)
        }
      })

    return () => {
      isMounted = false
    }
  }, [filter])

  // at first `teams` will be `[]` but after the API
  // response, it'll return again with the API data
  // (provided the component is still mounted)

  return teams
}

// Take a filter and return the players when we
// get the data
const usePlayers = (filter = '') => {
  const [players, setPlayers] = useState([])

  useEffect(() => {
    let isMounted = true

    window
      .fetch(`https://api.benmvp.com/players?q=${filter}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setPlayers(data.players)
        }
      })

    return () => {
      isMounted = false
    }
  }, [filter])

  // at first `teams` will be `[]` but after the API
  // response, it'll return again with the API data
  // (provided the component is still mounted)

  return players
}

const Page = () => {
  const [teamsFilter, setTeamFilter] = useState('')
  const [playersFilter, setPlayersFilter] = useState('')
  const teams = useTeams(teamsFilter)
  const players = usePlayers(playersFilter)

  return (
    <div>
      <TeamsFilter filter={teamsFilter} onChange={setTeamFilter} />
      <PlayersFilter filter={playersFilter} onChange={setPlayersFilter} />

      <Teams teams={teams} />
      <Players players={players} teams={teams} />
    </div>
  )
}
```

Overall the code is a bit longer than it was before, but I would argue that it is easier to reason about now that the component logic is split out into the `useTeams()` and `usePlayers()` custom Hooks. We can think of custom Hooks in much the same way we thinking about regular JavaScript helper/utility functions that extract logic. The unique aspect about custom Hooks is that they can call other Hooks. And when the state within the custom Hook updates, the component that calls the Hook also is re-rendered in order to retrieve the new data!

Now instead of the `Page` component maintaining the `teams` and `players` states directly, it gets them `useTeams()` and `usePlayers()`, respectively. The `useTeams()` and `usePlayers()` custom Hooks are only being used once, but I extracted them just to "clean up" the component. What it's responsible for now is greatly simplified. In my opinion, it's much easier to follow what's happen in `Page`.

The extraction also allows me to now zero in on the logic of the Hooks themselves. There are still some commonalities between `useTeams()` and `usePlayers()`. They both make API calls, and they both check the mounted state before setting the state. Let's try extracting _that_ logic into a `useFetch()` custom Hook.

```js
import { useEffect, useState } from 'react'

// given a url fetch the data and return the JSON
// response, provided that the component is still
// mounted
const useFetch = (url) => {
  const [jsonData, setJsonData] = useState(undefined)

  useEffect(() => {
    let isMounted = true

    window
      .fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setJsonData(data)
        }
      })

    return () => {
      isMounted = false
    }
  }, [url])

  // at first `jsonData` will be `undefined but after the API
  // response, it'll return again with the API data
  // (provided the component is still mounted)

  return jsonData
}

const useTeams = (filter = '') => {
  const data = useFetch(`https://api.benmvp.com/teams?q=${filter}`)

  // if `data` or `data.teams` is `undefined` return `[]`
  return data?.teams ?? []
}

const usePlayers = (filter = '') => {
  const data = useFetch(`https://api.benmvp.com/players?q=${filter}`)

  // if `data` or `data.players` is `undefined` return `[]`
  return data?.players ?? []
}

const Page = () => {
  const [teamsFilter, setTeamFilter] = useState('')
  const [playersFilter, setPlayersFilter] = useState('')
  const teams = useTeams(teamsFilter)
  const players = usePlayers(playersFilter)

  return (
    <div>
      <TeamsFilter filter={teamsFilter} onChange={setTeamFilter} />
      <PlayersFilter filter={playersFilter} onChange={setPlayersFilter} />

      <Teams teams={teams} />
      <Players players={players} teams={teams} />
    </div>
  )
}
```

> If the [`?.` (optional chaining)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining) or [`??` (nullish coalescing)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) operators are new to you, check out my [Using new-ish & lesser-known JavaScript operators to write concise code](/blog/using-javascript-operators-write-concise-code/) post that explains them and other cool operators you might not yet know (but totally should).

Now the `useTeams()` and `usePlayers()` custom Hooks have been hollowed out. Their `data` is initially `undefined` prior to the API request in `useFetch()`. And then when `useFetch()` gets back the JSON data, it'll set it only if the `useEffect()` hasn't been cleaned up. As a result of the state update in `useFetch()`, the `useTeams()` or `usePlayers()` Hooks re-run to get the new `data` which will be returned back to the `Page` component.

And now that we have a rather generic `useFetch()` helper we can add more functionality to it (like having a loading state or error handling) without adding complexity to the `Page` component or even the `useTeams()` and `usePlayers()` custom Hooks. That's the power of React custom Hooks.

---

It takes some time to get the hang out creating React custom Hooks. Most of the time I write the "messy" logic in the component first and then extract it into a custom Hook. But sometimes I am able to "see in the future" and build the custom Hook first and "magically" have the data ready in the component.

Got any fun custom React Hooks that you've developed or that you frequently use? I'd love to hear about them! Tweet me at [@benmvp](https://twitter.com/benmvp).

Keep learning my friends. 🤓
