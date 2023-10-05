---
title: "Retrospective: nonovel.io"
description: "Some insight into the decision making and challenges faced when building nonovel.io"
publishDate: "September 30, 2023"
tags: ["retrospective", "nonovel"]
draft: false
---

I love making websites, but unless it's a SaaS or (hopefully) useful tool: what can I contribute? What can I say that hasn't already been said? Not much. I can only write so many blog posts and ChatGPT doesn't make very appealing content... yet. 

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

Some of these ended up in production, some of them didn't. That's okay - it could change at any time. This is a passion project and I intend to continue working on it.

## Choosing a stack

I'm constantly searching for the "ideal" stack. I want to make a lot of things, eventually; I need something comfortable and easy to work with.

### Frontend

- [**Next.js**](https://nextjs.org/): Next is a great framework, but I probably wouldn't choose it again for this project. My priorities were simple: 
  - Typescript
  - Full Stack
  - Serverless (scale to zero)
  - Familiarity

I've spent so much time with Next already that it was an easy pick, but [Astro](https://astro.build/) would likely be a better choice as the content is largely static. I did get some hands-on time with the new App directory and RSC, so it was still a success.

- [**TailwindCSS**](https://tailwindcss.com/): Need I say more?

- [**Radix primitives**](https://www.radix-ui.com/primitives) and [**shadcn/ui**](https://ui.shadcn.com/): This was my first time using either. The un-opinionated nature of Radix has been great. I also found that `shadcn/ui`'s management approach to work really well with my workflow - I'm curious to see if this will start a trend of component libraries that aren't actually libraries. Uh... hm. They explain it better: 

> This is NOT a component library. It's a collection of re-usable components that you can copy and paste into your apps.

- [**ModelFusion (formerly `ai-utils.js`)**](https://modelfusion.dev/guide/): This is effectively just a wrapper around a few popular model hosting provider's APIs. I think I could have used LangChain, but that felt like overkill.

### Backend

- [**Next.js**](https://nextjs.org/): See above ⬆️
- [**NeonDB (serverless postgreSQL)**](https://neon.tech/): Neon has become my go-to hosting provider for PostgreSQL. [Planetscale](https://planetscale.com/) and [Vitess](https://vitess.io/) are super cool, but don't support foreign keys (and are built on top of MySQL 😢). [CockroachDB](https://www.cockroachlabs.com/) is probably fine, but Neon supports branching and has a great [serverless driver](https://github.com/neondatabase/serverless) that acts as a drop-in replacement for [node-postgres](https://node-postgres.com/). Vercel is reselling Neon's service branded as [Vercel Postres](https://vercel.com/docs/storage/vercel-postgres); if it's good enough for them then it's probably good enough for me. 
- [**DrizzleORM**](https://orm.drizzle.team/): Type-safe database queries? [Knex.js](https://knexjs.org/)-like query builder? I'm in love.
- [**Auth.js**](https://authjs.dev/): I don't have any significant complaints with Auth.js, but if I were starting over: I would likely go with a managed auth service, such as [Supabase Auth](https://supabase.com/) or [Clerk](https://clerk.com/). Auth.js is *fine* and I *could* roll my own auth (I've done so with previous projects), but both Clerk and Supabase have generous free tiers. I think the peace of mind that these services offer is worth the trade off of vendor lock-in.

## Importing content

I'm not dedicated enough to copy and paste books page by page, so what are some other options?

1. parse distributable publication files (epub, mobi, etc)
2. scrape other sites that host the same content

I decided to parse `.epub` files; It's something I've wanted to try for a while. The process is pretty straightforward on paper - epub files can be obtained from [Project Gutenburg](https://www.gutenberg.org/) and epub is an open standard. An epub file is just a zipped directory containing HTML and XML files. 

As it turns out, both of the above options end up being an exercise in traversing HTML.

Unfortunately, the epub specification has several versions, and most books seem to attempt to adhere to v2 and v3 at the same time for backwards compatibility. This leads to some wacky results. 

Looking back, option number 2 would have been significantly easier. Project Gutenburg typically also has [HTML versions](https://www.gutenberg.org/files/1513/1513-h/1513-h.htm) of the same books. 

Parsing epub files was a fun challenge, though.

## Metadata

Epub files conveniently have some of the required metadata embedded, such as book name and author. They do not, however, provide some key details that I need: 

1. Synopsis
2. Tagging
3. Cover

### Synopsis

This is the perfect excuse to use AI, right? Most of the books I'm interested in are *old* - certainly old enough to be written well before the 2021 knowledge cutoff of OpenAI's public models. 

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

This solution isn't perfect - the model can still hallucinate, but it has significantly improved the output accuracy. 

I use this specific trick for tagging and cover generation as well.

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

Covers *can* be extracted from the original epub file, but we can't safely assume that the cover is also within the public domain. What are the chances that the file contains the original cover art for *Romeo and Juliet* made in the 1500s?

Some of the embedded covers may be in the public domain and allow redistribution, but verifying that takes time and the goal is to automate as much as possible. 

So, time to create some covers.

I had a lot of fun with this. My first though was to use [Satori](https://github.com/vercel/satori) to render JSX to SVGs or PNGs. I *really* wanted this to work, but found that Satori too limiting. For example, [`flex` and `none` are the only supported display properties](https://github.com/vercel/satori#css). It's a trade-off between DX and real-time, on-the-fly generation. Here's an example OG image that I'm generating:

![Generated Frankenstein OG image](https://nonovel.io/api/og/p?id=15522bf4-71fa-41ed-87b5-7b40f8a7db6b)

It's *okay*, but the title in that example has an orphan that sticks significantly. Elsewhere, I'm using [React Wrap Balancer](https://react-wrap-balancer.vercel.app/) to avoid the issue entirely, but I'm not able to use that or any other text balancing scripts from within Satori. 

I explored some options for rasterizing PDFs, but also found that lacking - I really wanted the full flexibility of HTML and CSS.

...🤔

Puppeteer!

[Puppeteer](https://github.com/puppeteer/puppeteer) allows you to run a headless Chromium instance and control the browser via their SDK. This is the workflow I landed on: 

1. Create an endpoint for launching puppeteer: `/api/cover/screenshot?id=id`
2. Confirm that the model has enough knowledge on the book to reduce hallucination
3. Send puppeteer to a dynamic page that renders the cover `/cover?id=id`
   - Retrieve book details from the database
   - Use [Stability's API](https://platform.stability.ai/) (via ModelFusion) to generate some art
   - Render the page using JSX, just like any other page
4. Screenshot the page using puppeteer
5. Compress the screenshot using [Sharp](https://sharp.pixelplumbing.com/)
6. Upload to your favorite object storage provider ([Cloudflare's R2](https://www.cloudflare.com/developer-platform/r2/), in my case)

You may have questions about step 2. How can I confirm that an image generation model has specific knowledge of something? Well... I don't. I'm actually asking OpenAI's GPT-4. I'm just assuming that Stability's model won't have knowledge of the book if GPT-4 doesn't. If GPT-4 doesn't have the requisite knowledge, I'm instructing Stability to generate an abstract pattern instead. 

Here's an example of a generated cover:

![Generated Frankenstein cover image](https://nonovel.io/_next/image?url=https%3A%2F%2Fcdn.nonovel.io%2Ffrankenstein-or-the-modern-prometheus%2Fcover%2F2023-10-04T00%253A38%253A18.348Z.jpeg&w=828&q=100)

There's a few additional steps that I'll gloss over here. Namely: 

1. All endpoints (steps 1 - 3) need to be authorized to prevent abuse
2. Randomize the cover generation with a few different variations to make them less repetitive
3. Chromium does not work natively in serverless platforms. [@sparticuz/chromium](https://github.com/Sparticuz/chromium), however, does
4. Image generation APIs can take a while. I found it necessary to [increase Vercel's maxDuration](https://vercel.com/blog/customizing-serverless-functions) allowance for Lambda execution
5. Some REST clients have an insufficient default request timeout window. [Insomnia, for example, had a default of 30 seconds](https://docs.insomnia.rest/insomnia/request-timeouts)

## Articles?

An interesting SEO strategy is to publish articles or blog posts that are tangentially related to your site's content. I've seen this done with great success from the likes of [LogRocket](https://blog.logrocket.com/) and [DigitalOcean](https://www.digitalocean.com/blog). 

Coincidentally, a while back, I came across an interesting GPT wrapper: [WriteSonic](https://writesonic.com). WriteSonic scrapes the web and uses embeddings to write informed articles. This seems like an ideal use-case. 

[The articles it generates](https://nonovel.io/articles) are far from perfect, but they are the site's top ranking pages aside from the NoNovel homepage, so I'll classify it as a success. 

## Conclusion

This was a fun project; I learned a lot and got to play with a few different AIaaS APIs.

I'm still not sure if I would be better served by a batteries-included stack like Supabase, but did find that the choices I made were not a significant limiting factor of the end product. 