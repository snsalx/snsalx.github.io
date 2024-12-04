+++
title = 'Changing the Stack'
date = 2024-11-29T09:45:56Z
draft = true
+++

## Static

I'm going to write quite a few _articles_ on this site in the next few months, so I need a good way
to manage content. Writing raw HTML doesn't scale for that, and it's less readable. That's why
I wanted to switch to markdown. Plus, duplicating and updating things like the footer
(and the version number in it) gets tedious quickly. _That's why I want an SSG with template support._

The first option that came in mind is [Hugo](https://gohugo.io). It's a pretty simple solution
with fast build times and powerful template syntax. The website still needs to host some webapps, so
the vanillajs approach stays. Hugo is a good fit for that too, it doesn't get in the way.

I've also considered astro, but it requires NPM and Node and I just don't want to deal with that.

Adding hugo doesn't confilct with the original goals of the project, which are:

- Speed of development - I will primarilly use web tech.
- Simplicity and ease of reverse-engineering - anyone should be able to open up the dev console on
  any of my projects and understand how the project works.
- Acessibility - both English and Russian versions should be available, all pages make sense
  semantically and can be parsed.

The taxonomy and i18n features of hugo will come in handy too, I imagine.

## Wired

Sometimes I'll need a server for improving UX or a desktop agent when the browser just doesn't provide
something. I'm planning to use go and pocketbase for these situations. Both are stupid simple and more
than fast enough in both runtime and speed of development.
