import React, { FormEvent, useState } from 'react'
import {
  makeStyles,
  createStyles,
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Paper,
  Collapse,
  CircularProgress,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import Bugsnag from '@bugsnag/js'
import EmailIcon from '@material-ui/icons/Email'
import PersonIcon from '@material-ui/icons/Person'
import SendIcon from '@material-ui/icons/Send'

class SubscribeError extends Error {
  constructor(message: string) {
    super(message)

    this.name = 'SubscribeError'
  }
}

const addSubscriber = async ({ email, firstName, referrer }) => {
  const body = JSON.stringify({
    email,
    firstName,
    referrer,
  })
  const res = await fetch('/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': `${body.length}`,
    },
    body,
  })
  const data = await res.json()

  if (!res.ok) {
    if (res.status === 422) {
      throw new SubscribeError(data.message)
    } else {
      throw new Error(data.message)
    }
  }

  return data
}

const useStyles = makeStyles((theme) => {
  return createStyles({
    root: {
      textAlign: 'center',
      padding: theme.spacing(2),
    },
    button: {
      marginTop: theme.spacing(1),
    },
  })
})

type Status =
  | { state: 'inactive' }
  | { state: 'loading' }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string }

const SubscribeForm = () => {
  const classes = useStyles()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [status, setStatus] = useState<Status>({ state: 'inactive' })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (status.state === 'loading') {
      return
    }

    setStatus({ state: 'loading' })

    try {
      await addSubscriber({ email, firstName, referrer: window.location.href })

      setStatus({
        state: 'success',
        message:
          'You have successfully subscribed! Check your email to confirm your subscription',
      })
      setEmail('')
      setFirstName('')

      window.gtag?.('event', 'generate_lead', {
        currency: 'USD',
        value: 1,
      })
    } catch (err) {
      if (err instanceof SubscribeError) {
        setStatus({ state: 'error', message: err.message })
      } else {
        setStatus({
          state: 'error',
          message: 'Unknown error. Please try again.',
        })
        Bugsnag.notify(err as Error)
      }
    }
  }

  return (
    <Paper component="section" elevation={3} className={classes.root}>
      <Typography variant="h5" component="h1" gutterBottom>
        Subscribe to the Newsletter
      </Typography>
      <Typography variant="body1" gutterBottom>
        Get notified about new blog posts, minishops &amp; other goodies
      </Typography>

      <Collapse in={status.state === 'success' || status.state === 'error'}>
        <Box mt={1}>
          <Alert
            severity={status.state === 'success' ? 'success' : 'error'}
            onClose={() => setStatus({ state: 'inactive' })}
          >
            {status.state === 'success' || status.state === 'error'
              ? status.message
              : ''}
          </Alert>
        </Box>
      </Collapse>

      <Box
        component="form"
        method="post"
        mt={1}
        name="subscribe"
        onSubmit={handleSubmit}
      >
        <TextField
          type="email"
          label="Email"
          variant="outlined"
          required
          fullWidth
          margin="normal"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon />
              </InputAdornment>
            ),
          }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="First Name"
          variant="outlined"
          required
          fullWidth
          margin="normal"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon />
              </InputAdornment>
            ),
          }}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          endIcon={
            status.state === 'loading' ? (
              <CircularProgress color="inherit" size={20} />
            ) : (
              <SendIcon />
            )
          }
          className={classes.button}
        >
          Subscribe
        </Button>
      </Box>
    </Paper>
  )
}

export default SubscribeForm
