import type { APIContext, GetStaticPaths } from "astro";
import { getEntryBySlug } from "astro:content";
import satori, { type SatoriOptions } from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import { siteConfig } from "@/site-config";
import { getAllPosts, getFormattedDate } from "@/utils";

import RobotoMono from "@/assets/roboto-mono-regular.ttf";
import RobotoMonoBold from "@/assets/roboto-mono-700.ttf";

const ogOptions: SatoriOptions = {
	width: 1200,
	height: 630,
	// debug: true,
	fonts: [
		{
			name: "Roboto Mono",
			data: Buffer.from(RobotoMono),
			weight: 400,
			style: "normal",
		},
		{
			name: "Roboto Mono",
			data: Buffer.from(RobotoMonoBold),
			weight: 700,
			style: "normal",
		},
	],
};

const markup = (title: string, pubDate: string) =>
	html`<div tw="flex flex-col w-full h-full bg-[#1d1f21] text-[#c9cacc]">
		<div tw="flex flex-col flex-1 w-full p-10 justify-center">
			<p tw="text-2xl mb-6">${pubDate}</p>
			<h1 tw="text-6xl font-bold leading-snug text-white">${title}</h1>
		</div>
		<div tw="flex items-center justify-between w-full p-10 border-t border-[#2bbc89] text-xl">
			<div tw="flex items-center">
				<svg
					version="1.2"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 480 480"
					width="30"
					height="30"
				>
					<path
						id="Layer"
						class="s0"
						fill="#ffffff"
						d="m443.5 206c-13.2 0-25 5.7-33.2 14.8h-88.1l62.3-62.3c12.2 0.7 24.6-3.6 33.9-12.9 17.4-17.4 17.4-45.6 0-63-17.4-17.4-45.5-17.4-62.9 0-9.4 9.3-13.7 21.7-13 33.9l-62.3 62.3v-88.1c9.1-8.1 14.8-20 14.8-33.2 0-24.6-19.9-44.5-44.5-44.5-24.6 0-44.5 19.9-44.5 44.5 0 13.2 5.7 25.1 14.8 33.2v88.1l-62.3-62.3c0.7-12.2-3.6-24.6-12.9-33.9-17.4-17.4-45.6-17.4-63 0-17.4 17.4-17.4 45.6 0 63 9.3 9.3 21.7 13.6 33.9 12.9l62.3 62.3h-88.1c-8.1-9.1-20-14.8-33.2-14.8-24.6 0-44.5 19.9-44.5 44.5 0 24.6 19.9 44.5 44.5 44.5 13.2 0 25.1-5.7 33.2-14.8h88.1l-62.3 62.3c-12.2-0.7-24.6 3.6-33.9 13-17.4 17.4-17.4 45.5 0 62.9 17.4 17.4 45.6 17.4 63 0 9.3-9.3 13.6-21.7 12.9-33.9l62.3-62.3v88.1c-9.1 8.1-14.8 20-14.8 33.2 0 24.6 19.9 44.5 44.5 44.5 24.6 0 44.5-19.9 44.5-44.5 0-13.2-5.7-25.1-14.8-33.2v-88.1l62.3 62.3c-0.7 12.2 3.6 24.6 13 33.9 17.4 17.4 45.5 17.4 62.9 0 17.4-17.4 17.4-45.6 0-63-9.3-9.3-21.7-13.6-33.9-12.9l-62.3-62.3h88.1c8.1 9.1 20 14.8 33.2 14.8 24.6 0 44.5-19.9 44.5-44.5 0-24.6-19.9-44.5-44.5-44.5z"
					/>
				</svg>
				<p tw="ml-3 font-semibold">${siteConfig.title}</p>
			</div>
			<p>by ${siteConfig.author}</p>
		</div>
	</div>`;

export async function GET({ params: { slug } }: APIContext) {
	const post = await getEntryBySlug("post", slug!);
	const title = post?.data.title ?? siteConfig.title;
	const postDate = getFormattedDate(
		post?.data.updatedDate ?? post?.data.publishDate ?? Date.now(),
		{
			weekday: "long",
			month: "long",
		},
	);
	const svg = await satori(markup(title, postDate), ogOptions);
	const png = new Resvg(svg).render().asPng();
	return new Response(png, {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}

export const getStaticPaths: GetStaticPaths = async () => {
	const posts = await getAllPosts();
	return posts.filter(({ data }) => !data.ogImage).map(({ slug }) => ({ params: { slug } }));
};
