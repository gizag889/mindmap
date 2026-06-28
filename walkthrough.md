# 課金・クレジット管理システム 実装完了のウォークスルー

計画書に基づいて、すべてのフェーズ（Phase 1 〜 Phase 5）の実装を完了しました。以下はシステム全体の実装内容とアーキテクチャの概要です。

## 1. 認証とアカウントリンク (Supabase)
- **匿名ログイン**: アプリを起動すると自動的に Supabase の Anonymous Auth が実行され、ユーザーに意識させることなく一意のセッション（JWT）が発行されます。
- **Google OAuth 連携**: 匿名ユーザーのまま課金画面（Paywall）に到達した場合、アカウント消失を防ぐために `Googleアカウントと連携する` ボタンを表示します。タップすると `expo-web-browser` を用いてブラウザ経由でセキュアにGoogle連携が行われます。

## 2. クレジット管理とDB構造 (Cloudflare D1)
`worker` ディレクトリ内に以下のテーブルを含むスキーマ (`schema.sql`) を構築しました。
- `users`: 残高とPro権限を管理。初回アクセス時に自動で作成し、**70クレジット**を無料付与します。
- `credit_transactions`: 消費と付与の履歴。
- `entitlements`: サブスクリプション状態。

## 3. 安全なトランザクション処理と返金 (Cloudflare Workers)
`/api/chat`（※現在 `index.ts` のデフォルトルート）では以下の厳密な処理を行っています。
1. **JWT検証**: リクエストヘッダーのトークンを `@tsndr/cloudflare-worker-jwt` で検証し、ユーザーを特定。
2. **事前残高確認**: Pro版ではなく、かつ残高が不足している場合は `402 Payment Required` を返却。
3. **事前消費**: Gemini呼び出し前に `D1.batch` を使ってクレジットをマイナスし、履歴に記録。
4. **LLM呼び出し**: Gemini APIへリクエスト。
5. **返金（Refund）処理**: Gemini APIがエラー（サーバー混雑等）を返した場合、消費したクレジットを再び加算（返金）してエラーを返すため、ユーザーが損をすることはありません。

## 4. アプリ内課金とペイウォール (RevenueCat)
- **`react-native-purchases`** を導入し、`src/hooks/useBilling.ts` で初期化と購入処理を管理しています。
- **PaywallModal**: `useMindMap` が `402` エラーを受け取ると自動でモーダルが立ち上がります。匿名ユーザーへの警告文、利用可能なパッケージの表示、購入ボタンを備えています。

## 5. Webhook と即時反映
- **`/api/verify-purchase`**: クライアント側で購入完了後、即座に Worker を叩いて `users` や `credit_transactions` を更新し、ラグなしでアプリにクレジットやPro権限を反映させます。
- **`/webhooks/revenuecat`**: サブスクリプションの更新や解約などをバックグラウンドで処理し、D1の `entitlements` テーブルを最新に保つための公式Webhookエンドポイントを用意しました。

---

> [!TIP]
> **今後の設定（本番公開に向けて）**
> - RevenueCat のダッシュボードで Apple/Google のアプリ内課金アイテムを作成し、APIキー（公開キー）を `.env` に設定してください。
> - RevenueCat の Webhook 先URLに、Cloudflare Workers をデプロイした先のURL（例: `https://mindmap-api.<account>.workers.dev/webhooks/revenuecat`）を登録してください。

以上で、安定して収益化可能な「AIクレジット・サブスクリプションモデル」の土台が完成しました！アプリを再起動（`r`キーなどでリロード）し、適宜動作をご確認ください。
