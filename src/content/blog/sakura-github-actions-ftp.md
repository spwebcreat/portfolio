---
title: "さくらサーバー × GitHub Actions FTPデプロイで詰まった3つのポイント"
description: "さくらのレンタルサーバーにGitHub Actionsで自動デプロイしようとしたら、想定外のハマりポイントが3つ。Secretsの登録先ミス、国外IPフィルタ、FTPSの接続エラー、それぞれの原因と解決策をまとめました。"
pubDate: "2026-03-17"
category: "tech"
tags: ["GitHub Actions", "FTP", "さくらサーバー", "CI/CD"]
draft: false
heroImage: "../../assets/img/blog/sakura-github-actions-ftp.jpg"
---

## はじめに

クライアントのWEBサイトをGitHub管理し、`main`ブランチにpushしたら自動でさくらのレンタルサーバーにデプロイされる——という仕組みを作りたかった。

PHPやGASのソースコードを手動でFTPアップロードするのは手間だし、「あれ、どのファイルを更新したっけ？」という事故も起きかねない。GitHub Actionsで自動化すれば、pushするだけでデプロイが完了する。

仕組み自体はシンプルなはずだったが、さくらサーバー特有の事情もあり、想定外のハマりポイントが3つあった。同じ構成で詰まっている方の参考になれば。


## やりたかったこと

```
ローカルで開発
    ↓
git push（mainブランチ）
    ↓
GitHub Actionsが起動
    ↓
FTPでさくらサーバーにデプロイ
```

シンプル。やりたいことはこれだけ。


## 詰まりポイント① Secretsの登録先ミス

GitHub Actionsで使うFTPのホスト名やパスワードは、GitHubのSecretsに登録する。これは基本中の基本なので迷わなかった…はずだった。

### 何が起きたか

ワークフローを動かしても、Secretsの値が空で取得できない。設定画面を何度見直してもちゃんと登録されている。なのに動かない。

### 原因

**Organization全体のSecretsに登録していた。**

GitHub Organizationを使っている場合、Secretsの登録先が2つある：

| 登録先 | 参照範囲 |
|--------|---------|
| Organization Secrets | Organization内の全リポジトリ（ポリシー設定が必要） |
| Repository Secrets | そのリポジトリのみ |

Organizationに登録したSecretsは、デフォルトではリポジトリから参照できない。アクセスポリシーを明示的に設定するか、リポジトリ単位で登録し直す必要がある。

### 解決策

**リポジトリ単位でSecretsを登録し直した。**

`Settings` → `Secrets and variables` → `Actions` → `Repository secrets` に、FTPのホスト名・ユーザー名・パスワードを登録。これで問題なく参照できるようになった。

Organization Secretsが便利なのは、複数リポジトリで同じ認証情報を使いまわすケース。今回のように1リポジトリ固有のFTP情報なら、Repository Secretsの方がシンプルで確実。


## 詰まりポイント② さくらの国外IPフィルタ

Secretsの問題を解消して再実行。今度はFTP接続自体がタイムアウトで失敗する。

### 何が起きたか

ローカルからFTP接続すると問題なくつながる。でもGitHub Actionsからだとタイムアウト。

### 原因

**さくらのレンタルサーバーには「国外IPアドレスフィルタ」がある。**

GitHub Actionsのランナーは海外（主にアメリカ）のサーバーで動いている。さくらのコントロールパネルで国外IPフィルタが有効になっていると、海外IPからのFTP接続がブロックされる。

### 解決策

さくらのコントロールパネルから**国外IPアドレスフィルタを無効化**した。

`コントロールパネル` → `セキュリティ` → `国外IPアドレスフィルタ`

ただし、これはFTPだけでなくWebアクセスにも影響する設定なので注意が必要。不安な場合は、FTPのみ国外IPを許可する設定がないか確認してもよいと思う。

自分の場合は、FTP認証自体がパスワードで保護されているし、サーバー上のファイルに機密情報は置いていない（シークレットは手動管理）ので、フィルタ無効化で運用している。


## 詰まりポイント③ FTPSの接続エラー（ECONNRESET）

国外IPフィルタを無効化して、いよいよ接続は通った。ファイル転送が始まる…と思いきや、今度は別のエラー。

### 何が起きたか

FTPデプロイによく使われる**SamKirkland/FTP-Deploy-Action**を使っていたが、ファイル転送中に`ECONNRESET`エラーで失敗する。何度リトライしても同じ。

### 原因

これはさくらサーバーとの相性問題。SamKirkland/FTP-Deploy-Actionが内部で使っているFTPSのデータソケットが、さくらサーバー側で切断されるという**既知の問題**だった。

### 解決策

**FTP-Deploy-Actionをやめて、`lftp`コマンドに切り替えた。**

`lftp`はLinuxの定番FTPクライアントで、FTPSの接続処理が柔軟。さくらサーバーとの相性も良く、安定してファイル転送ができた。

GitHub Actionsのワークフローはこんな感じ：

```yaml
- name: Deploy via lftp
  run: |
    lftp -u ${{ secrets.FTP_USERNAME }},${{ secrets.FTP_PASSWORD }} ${{ secrets.FTP_SERVER }} <<EOF
    set ssl:verify-certificate no
    set ftp:ssl-allow yes
    mirror --reverse --only-newer --verbose ./dist/ ${{ secrets.FTP_REMOTE_DIR }}
    quit
    EOF
```

ポイントは`mirror --reverse --only-newer`。ローカル→リモートへの同期で、更新されたファイルだけを転送する。`--delete`オプションはあえて付けていない。サーバー側に手動で置いたファイル（シークレット系の設定ファイルなど）が消えないようにするため。

FTP系のGitHub Actionsは色々あるが、ホスティング環境との相性問題が起きやすい印象。`lftp`は少し設定が手間だが、互換性が高く安定している。困ったら`lftp`に切り替えるのは一つの手だと思う。


## シークレットファイルの管理について

CI/CDでFTPデプロイする際に気をつけているのが、**APIキーなどのシークレットファイルはCI/CDに乗せない**こと。

たとえば、PHPで使うAPIキーの設定ファイルや、`.env`ファイルは、最初にサーバーに手動でアップロードし、それ以降はFTPデプロイの対象から除外している。

`lftp`の`--only-newer`なら、サーバー上のファイルを消さないので、一度手動で置いたシークレットファイルはそのまま残る。この「CIに乗せない」判断は、シンプルだが安全性の面で重要だと思っている。


## まとめ

さくらサーバー × GitHub Actions FTPデプロイで詰まった3つのポイント：

1. **Secrets の登録先**: Organization Secrets → Repository Secretsに変更
2. **国外IPフィルタ**: さくらのコンパネで無効化（GitHub Actionsのランナーは海外IP）
3. **ECONNRESET**: FTP-Deploy-Action → `lftp`に切り替え

どれも原因がわかれば対処はシンプルだが、ハマっている最中は「なぜ動かないのか」がわからず時間を取られた。特に国外IPフィルタは、さくらサーバーを使い慣れていても気づきにくいポイントだと思う。

同じ構成で自動デプロイを検討している方の参考になれば幸いです。
