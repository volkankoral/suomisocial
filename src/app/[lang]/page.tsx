import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/dictionaries";

interface Props {
  params: Promise<{ lang: string }>
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-sm font-medium tracking-widest uppercase text-blue-600 dark:text-blue-400">
          {dict.home.eyebrow}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          {dict.home.title}
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {dict.home.subtitle}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-3 text-xs text-zinc-500 dark:text-zinc-500">
          <span className="font-mono">v0.0.1 · Faz 0</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{lang}</span>
        </div>
      </div>
    </main>
  );
}
