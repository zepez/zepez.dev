---
title: "nonovel.io, a retrospective"
description: "I love making websites, but unless it's a SaaS or (h..."
publishDate: "September 19, 2023"
tags: ["retrospective", "nonovel"]
draft: false
---

I love making websites, but unless it's a SaaS or (hopefully) useful tool: what can I say that hasn't already been said? Not much. I can only write so many blog posts and ChatGPT doesn't make very appealing content... yet. 

So I want to make a website, but have nothing to share; what are my options? 

Steal. Steal all the content. 

![patrick rubbing hands gif](https://media4.giphy.com/media/Dps6uX4XPOKeA/giphy.gif?cid=ecf05e479mec6xik7lizukx3jiedljs02l4guakt3olw1f1v&ep=v1_gifs_search&rid=giphy.gif&ct=g)

That's great, but can we steal ethically? I think so, hence: [nonovel.io](https://nonovel.io).

The idea is simple: public domain books can be ethically and legally redistributed, so why not? In fact, this type of project is especially appealing to me due to the variety of directions it could go: 

- Social features like comments, following?
- Self publishing? Allow users to monetize?
- Allow users to request new books? 
- Track user chapter progress?
- Customize reading experience, such as sizing, fonts or colors?

Some of these ended up in production, some of them didn't. That's okay - it could change at any time. 

## Choosing a stack

I'm constantly searching for the "ideal" stack. I want to make a lot of things, eventually; I want something comfortable and easy to work with.

### Frontend

- [**Next.js**](https://nextjs.org/): Next is a great framework, but I probably wouldn't choose it again for this project. The number one priority was something that would easily adapt to serverless, but [Astro](https://astro.build/) would likely be a better choice as the content is largely static. I did get some hands-on time with the new App dir paradigm and RSC, so it was a success from that perspective. Another boon is lack of significant vendor lock-in: it's well documented on how to slap Next.js in a container and host it on nearly any platform.

- [**TailwindCSS**](https://tailwindcss.com/): Need I say more?

- [**Radix primitives**](https://www.radix-ui.com/primitives) and [**shadcn/ui**](https://ui.shadcn.com/): This was my first time using either. The un-opinionated nature of Radix has been great; I'm never going back to [HeadlessUI](https://headlessui.com/). I also found that `shadcn/ui`'s management approach to work really well with my workflow - I'm curious to see if this will start a trend of component libraries that aren't actually libraries. Uh... hm. They explain it better: 

> This is NOT a component library. It's a collection of re-usable components that you can copy and paste into your apps.

- [**ModelFusion (formerly `ai-utils.js`)**](https://modelfusion.dev/guide/): This is effectively just a wrapper around a few popular model hosting providers for a consistent interface. I think I could have used LangChain, but that felt like overkill.

### Backend

- [**Next.js**](https://nextjs.org/): See above ⬆️
- [**NeonDB (serverless postgreSQL)**](https://neon.tech/): Neon is my go-to hosting provider for PostgreSQL, now. [Planetscale](https://planetscale.com/) and [Vitess](https://vitess.io/) are super cool, but they come with the significant limitation of not supporting foreign keys (and being built on top of MySQL 😢). [CockroachDB](https://www.cockroachlabs.com/) is probably fine, but Neon supports branching and has a great [serverless driver](https://github.com/neondatabase/serverless) that acts as a drop-in replacement for [node-postres](https://node-postgres.com/).
- [**DrizzleORM**](https://orm.drizzle.team/): Type-safe database queries? [Knex.js](https://knexjs.org/)-like query builder? I'm in love.
- **Redis** (for pub/sub)
- [**Railway**](https://railway.app/): Railway is a hosting platform. But wait! It's actually... easy to use? It takes roughly two clicks to spin up a Redis instance. That's a refreshing break from the Kubernetes sigma grindset I've been on for the last two years. I highly recommend trying out Railway for low maintenance microservices. 
- [**Auth.js**](https://authjs.dev/): I don't have any significant complaints with Auth.js, but if I were starting over: I would likely go with a managed auth service, such as [Supabase Auth](https://supabase.com/) or [Clerk](https://clerk.com/). Auth.js is *fine* and I *could* roll my own auth (I've done so with previous projects), but both Clerk and Supabase have generous free tiers. I think the peace of mind that these services offer is worth the trade off of vendor lock-in.

## Importing content

I'm not dedicated enough to copy and paste books page by page, so what are some other options?

1. parse distributable publication files (epub, mobi, etc)
2. scrape other sites that host the same content

I decided to parse `.epub` files; It's something I've wanted to try for a while. It should be simple - `.epub` files can be obtained from [Project Gutenburg](https://www.gutenberg.org/) and the format is open source. `.epub` files are just a `.zip` directory containing mostly `.html` files. 

As it turns out, both options end up being an exercise in traversing HTML.

Unfortunately, the `.epub` spec has several versions, and most books seem to attempt to adhere to v2 and v3 at the same time for backwards compatibility. This leads to some wacky results. 

Looking back, option number 2 would have been significantly easier. Project Gutenburg typically also has [HTML versions](https://www.gutenberg.org/files/1513/1513-h/1513-h.htm) of the same books. 

Parsing `.epub` files was a fun challenge, though.

## Metadata

The `.epub` files conveniently have some of the required metadata embedded, such as book name and author. They do not, however, provide some key details that I need: 

1. Synopsis
2. Tagging
3. Cover

### Synopsis

It's the perfect excuse to use AI, right? Most of the books I'm interested in are *old* - certainly old enough to be written well before the 2021 knowledge cutoff of OpenAI's public models. 

Synopsis generation can be done zero-shot, like so:

```typescript
`Please generate a short, spoiler-free synopsis for ${title} by ${author}`
```

...but I want go *fast*. I can't read every book to verify the model's output. How can I confirm that the model actually has enough knowledge on the book to create a synopsis? 

```typescript
// system message
"You will be provided a book name and author name. If you know enough about the book to write a short synopsis, please respond with true. If you do not, please respond with false. Do not respond with anything else, other than true or false."

// assistant response 
"Understood. Please provide the book title and author name."

// user message
`Book: ${title} by ${author}`
```

Then parse the response any way you want:

```typescript
const knows = response.toLowerCase() === "true";

if (!knows) throw new Error();
```

I also use this specific trick for tagging and cover generation.

### Tagging

LLMs can excel at this task too: 

```typescript
`Given the following genres, please select the genres that fundamentally define ${title} by ${author}.

${genres.join(", ")} 

Please consider the main themes, narrative, character development, and the author's intent when choosing the genres. 

Only select a genre if removing it would significantly alter the book's identity or understanding.`
```

Of course, there's some additional processing required, but the whole workflow can be boiled down to the following: 

1. Confirm that the model has enough knowledge on the book
2. Get all genres from the database
3. Format all genre names for consistency
4. Ask the model to select the proper genres
5. Filter the response to ensure we're left with "real" genres, in the case of hallucination
6. Get the ids for each genre and create the `project <-> project_genre <-> genre` database relation

### Covers

Covers *can* be extracted from the original `.epub` file, but we can't safely assume that the cover is also within the public domain. What are the chances that the file contains the original cover of *Romeo and Juliet* from the 1500s?

So, time to create some covers.

I had a lot of fun with this. My first though was to use [Satori](https://github.com/vercel/satori) to convert JSX to PNGs. I *really* wanted this to work, but found that Satori has a lot of limitations. For example, [`flex` and `none` are the only supported display properties](https://github.com/vercel/satori#css). It's a trade-off between DX and real-time, on-the-fly generation. Here's a proof of concept for the OG image of a chapter page:

![The Three Musketeers PoC OG image](https://nonovel.io/api/og/p?title=The%20Three%20Musketeers&image=the-three-musketeers/cover/2023-07-31T23:30:09.653Z.jpeg&chapter=Concerning%20A%20Court%20Intrigue)

The design can and will (*eventually*) be improved, but it won't be fun.

I explored some options for rasterizing PDFs, but also found that lacking - I really wanted the full flexibility of HTML and CSS.

...

Puppeteer!

[Puppeteer](https://github.com/puppeteer/puppeteer) allows you to run a headless Chromium instance and control the browser via their SDK. This is the workflow I landed on: 

1. Confirm that the model has enough knowledge on the book
2. Use [Stability's API](https://platform.stability.ai/) to generate some art. This can be as complicated as you want: 

```typescript
`beautiful book illustration, ${title}, ${author}`
```

3. Use handlebars to template the HTML cover
4. Use puppeteer to launch a headless chromium instance
5. Use puppeteer to screenshot the page
6. Compress the screenshot using [Sharp](https://sharp.pixelplumbing.com/) and upload to your favorite object storage provider ([Cloudflare's R2](https://www.cloudflare.com/developer-platform/r2/), in my case)

You may have questions about step 1. How can I confirm that an image generation model has specific knowledge? Well... I don't. I'm actually asking OpenAI's ChatGPT. I'm just assuming that Stability's model won't have knowledge of the book if ChatGPT doesn't. If ChatGPT doesn't have the requisite knowledge, I'm instructing Stability to generate an abstract pattern instead. 

Here's a simple proof of concept cover: 

![The Enchanted April PoC cover](https://nonovel.io/_next/image?url=https://cdn.nonovel.io/the-enchanted-april/cover/2023-07-31T23%253A22%253A51.228Z.jpeg&w=828&q=75)

Design improvements are necessary, but it works!

The biggest drawback of this approach comes from my own inaccurate assumptions. I didn't think it was possible to run puppeteer from within AWS Lambda functions (ergo Vercel). My solution to this was to create a microservice that uses a [Bull queue](https://github.com/OptimalBits/bull), specifically for generating covers. I embedded Puppeteer in the container and threw it up in Railway. 

This approach is *okay*, but requires a long-running server. However, I recently found [chrome-aws-lambda](https://github.com/alixaxel/chrome-aws-lambda), which should allow me to create a serverless endpoint for generating the covers 🎉. I'll be exploring that in the coming weeks.

## Articles?

An interesting SEO strategy is to publish articles or blog posts that are tangentially related to your site's content. I've seen this done with great success from the likes of [LogRocket](https://blog.logrocket.com/) and [DigitalOcean](https://www.digitalocean.com/blog). 

Coincidentally, a while back, I came across an interesting GPT wrapper: [WriteSonic](https://writesonic.com). WriteSonic scrapes the web and uses embeddings to write informed articles. This seems like an ideal use-case. 

[The articles it generates](https://nonovel.io/articles) are far from perfect, but they are the site's top ranking pages aside from the NoNovel homepage, so I'll classify it as a success. 