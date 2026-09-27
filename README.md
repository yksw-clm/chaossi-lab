This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ちゃおチャットのデータベース

`/chao-chat` は複数の人で投稿を共有するため、Neon PostgreSQL を使用します。

1. Vercel のプロジェクトで Storage → Marketplace から [Neon](https://vercel.com/marketplace/neon/neon) を追加し、このプロジェクトに接続します。
2. ローカルの `.env.local` に `DATABASE_URL`（または `POSTGRES_URL`）を設定し、`bun run db:setup:chao-chat` を実行します。このコマンドで [`db/chao-chat.sql`](db/chao-chat.sql) のテーブルを作成します。Neon の SQL Editor から同じ SQL を実行しても構いません。
3. Vercel の環境変数にも接続文字列が追加されたことを確認して再デプロイします。Neon 連携で自動設定されない場合は、サーバー側の環境変数として登録してください。接続文字列は Git に追加しないでください。

DB 未接続の間、投稿画面には設定が必要である旨が表示されます。投稿は1ページ20件で、同じ接続元からの連続投稿は30秒間制限されます。
投稿者IDは初回投稿時に発行し、同じブラウザのCookieに1年間保存します。Cookieを消すと新しいIDになります。既存の投稿にもIDを付けるため、機能更新後に `bun run db:setup:chao-chat` を再実行してください。

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
