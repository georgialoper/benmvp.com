import React from 'react'
import { makeStyles, createStyles, Typography } from '@material-ui/core'

interface Props {
  children: string
}

const useStyles = makeStyles((theme) =>
  createStyles({
    root: {
      '& h2': theme.typography.h5,
      '& h3': theme.typography.h6,
      '& h4': theme.typography.h6,
      '& h5': theme.typography.subtitle1,
      '& h6': theme.typography.subtitle2,
      '& p': {
        ...theme.typography.body1,
        margin: theme.spacing(0, 0, 2, 0),
      },
      '& p > img': {
        display: 'block',
        margin: '0 auto',
        maxWidth: 800,
        width: '100%',
      },
      '& p > .gatsby-resp-image-wrapper + em': {
        ...theme.typography.caption,
        display: 'block',
        textAlign: 'right',
        maxWidth: 800,
        margin: theme.spacing(1, 2),
      },
      '& ul': {
        listStyle: 'circle',
        padding: theme.spacing(0, 0, 0, 3),
        [theme.breakpoints.up('md')]: {
          padding: theme.spacing(0, 0, 0, 4),
        },
      },
      '& li': {
        margin: theme.spacing(0, 0, 1, 0),
      },
      '& a:not(.anchor)': {
        color: theme.palette.primary.main,
      },
      '& blockquote': {
        borderLeft: `5px solid ${theme.palette.secondary.main}`,
        fontStyle: 'italic',
        margin: theme.spacing(2.5, 0, 2.5, 5),
        padding: theme.spacing(1.5),
        '& p': {
          margin: 0,
        },
      },
      '& hr': {
        border: 'none',
        height: 1,
        width: '50%',
        backgroundColor: theme.palette.divider,
        margin: theme.spacing(4, 'auto'),
      },
      '& .gatsby-highlight': {
        // code blocks
        marginBottom: theme.spacing(3),
      },
      '& .gatsby-resp-iframe-wrapper': {
        // iframes (video embeds)
        margin: theme.spacing(0, 0, 3, 2),
      },
      '& .twitter-tweet': {
        margin: `0 auto ${theme.spacing(2)}px auto`,
      },
    },
  }),
)

const Content = ({ children }: Props) => {
  const classes = useStyles()

  return (
    <Typography
      variant="body1"
      component="article"
      dangerouslySetInnerHTML={{ __html: children }}
      className={classes.root}
    />
  )
}

export default Content
