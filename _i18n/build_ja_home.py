"""Build ja/index.html from index.html.

Run from the repo root after changing the English homepage:
    uv run --no-project python -I _i18n/build_ja_home.py

Every (english, japanese) pair must match the English page the expected
number of times, or the script stops and names the pair. That way a
copy edit on the English page can't silently leave stale English (or a
stale translation) on the Japanese one.
"""

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "index.html"
DST = ROOT / "ja" / "index.html"

# (english, japanese, expected count in the English page)
PAIRS = [
    # --- head ---
    ('<html lang="en">', '<html lang="ja">', 1),
    (
        "<title>Jase Lindgren</title>",
        "<title>Jase Lindgren（ジェイス・リンドグレン）</title>",
        1,
    ),
    (
        "family=Space+Mono:wght@400;700&display=swap",
        "family=M+PLUS+1+Code:wght@400;700&family=Space+Mono:wght@400;700&display=swap",
        1,
    ),
    (
        'font-family: "Space Mono", monospace;',
        'font-family: "Space Mono", "M PLUS 1 Code", monospace;\n'
        "        line-break: strict;\n"
        "        word-break: auto-phrase;",
        1,
    ),
    # --- hero ---
    (
        '<div class="eyebrow">personal // home</div>',
        '<div class="eyebrow">personal // ホーム</div>',
        1,
    ),
    (
        """            Tinkerer&nbsp;&nbsp;·&nbsp;&nbsp;Podcaster&nbsp;&nbsp;·&nbsp;&nbsp;Musician&nbsp;&nbsp;·&nbsp;&nbsp;App
            Developer&nbsp;&nbsp;·&nbsp;&nbsp;VFX
            Artist&nbsp;&nbsp;·&nbsp;&nbsp;Public Speaker""",
        """            ものづくり好き&nbsp;&nbsp;·&nbsp; ポッドキャスター&nbsp;&nbsp;·&nbsp; ミュージシャン&nbsp;&nbsp;·&nbsp; アプリ開発者&nbsp;&nbsp;·&nbsp; VFXアーティスト&nbsp;&nbsp;·&nbsp; 講演者""",
        1,
    ),
    (
        """            Seattle, WA and Osaka, Japan based engineer &amp; P4 evangelist
            building tools for game and VFX pipelines. I host the In Development
            podcast, create tutorials and speak at conferences, and make music
            on the side.""",
        """            シアトルと大阪を拠点に、ゲームやVFXのパイプライン向けツールを開発しているエンジニア兼P4エバンジェリストです。ポッドキャスト「In
            Development」のホストを務め、チュートリアルの制作やカンファレンスでの講演も行っています。趣味は音楽制作です。""",
        1,
    ),
    # --- section titles ---
    ("open source <span", "オープンソース <span", 1),
    ("talks &amp; series <span", "講演・シリーズ <span", 1),
    ("other projects <span", "その他のプロジェクト <span", 1),
    # --- open source cards ---
    (
        """                  A simple web dashboard for managing users across multiple
                  Perforce servers.""",
        """                  複数のPerforceサーバのユーザをまとめて管理できる、シンプルなWebダッシュボード。日本語のドキュメントあり。""",
        1,
    ),
    (
        """                  A GUI app that bulk-creates users, groups, and depots from a
                  CSV — populating streams and files from a template depot.""",
        """                  CSVからユーザ、グループ、ディポを一括作成するGUIアプリ。テンプレートのディポからストリームとファイルも展開します。""",
        1,
    ),
    (
        """                  A deliberately dangerous admin tool for bulk-deleting content
                  from a P4 server — use with extreme caution.""",
        """                  P4サーバからコンテンツを一括削除する、あえて危険な管理者向けツール。使用には細心の注意を。""",
        1,
    ),
    (
        """                  A CLI that turns Perforce P4 history into a Gource-style log
                  for animated depot-activity visualizations.""",
        """                  Perforce P4の履歴をGource形式のログに変換し、ディポのアクティビティをアニメーションで可視化するCLIツール。""",
        1,
    ),
    (
        """                  Posts a message to Discord or Slack every time a new
                  changelist is submitted to Perforce P4.""",
        """                  Perforce P4に新しいチェンジリストがサブミットされるたびに、DiscordやSlackへメッセージを投稿します。""",
        1,
    ),
    (
        'href="/ultimate-p4v-toolkit/"',
        'href="/ultimate-p4v-toolkit/ja/"',
        1,
    ),
    (
        """                  Free tabs and right-click tools for P4V and P4Admin: see
                  who has what checked out, what's changing across the server,
                  and where the space is going. Nothing to install.""",
        """                  P4VとP4Admin用の無料タブと右クリックツール集。誰が何をチェックアウトしているか、サーバ全体で何が変更されているか、容量がどこで使われているかがひと目でわかります。インストール不要。""",
        1,
    ),
    # --- talks: titles stay English (the talks are in English) ---
    (
        '<div class="talk-venue">Perforce · Webinar 2026</div>',
        '<div class="talk-venue">Perforce · ウェビナー 2026</div>',
        1,
    ),
    (
        """                  >watch →</a""",
        """                  >視聴する（英語）→</a""",
        1,
    ),
    (
        '<div class="talk-venue">IGDA — Webinar 2026</div>',
        '<div class="talk-venue">IGDA — ウェビナー 2026</div>',
        1,
    ),
    (
        '<div class="talk-venue">Global Game Jam — Webinar 2026</div>',
        '<div class="talk-venue">Global Game Jam — ウェビナー 2026</div>',
        1,
    ),
    (
        '<div class="talk-venue">YouTube · Tutorial Series</div>',
        '<div class="talk-venue">YouTube · チュートリアルシリーズ（英語）</div>',
        2,
    ),
    (
        '<div class="talk-venue">Perforce · Podcast</div>',
        '<div class="talk-venue">Perforce · ポッドキャスト（英語）</div>',
        1,
    ),
    (
        """                  >watch &amp; resources →</a""",
        """                  >動画・資料（英語）→</a""",
        4,
    ),
    (
        '<a class="talk-res" href="ggj-2026/">resources →</a>',
        '<a class="talk-res" href="/ggj-2026/">資料（英語）→</a>',
        1,
    ),
    # Talk pages are English-only, so links from /ja/ must go up a level.
    ('href="igda-2026/"', 'href="/igda-2026/"', 3),
    ('href="ggj-2026/"', 'href="/ggj-2026/"', 2),
    ('href="unreal-bali-2025/"', 'href="/unreal-bali-2025/"', 3),
    ('href="unreal-orlando-2025/"', 'href="/unreal-orlando-2025/"', 3),
    ('href="uefest2024/"', 'href="/uefest2024/"', 3),
    # --- other projects ---
    ('href="p4ignore-converter/"', 'href="/ja/p4ignore-converter/"', 1),
    (
        '<span class="glitch">.gitignore → .p4ignore Converter</span>',
        '<span class="glitch">.gitignore → .p4ignore 変換ツール</span>',
        1,
    ),
    (
        """                  Convert a .gitignore file into Perforce .p4ignore format in
                  your browser.""",
        """                  .gitignore ファイルを、ブラウザ上で Perforce の .p4ignore 形式に変換します。""",
        1,
    ),
    (
        '<span class="glitch">QR Code Generator</span>',
        '<span class="glitch">QRコードジェネレータ</span>',
        1,
    ),
    (
        """                  A simple QR code generator, hosted at Argonaut Creations.""",
        """                  シンプルなQRコードジェネレータ。Argonaut Creationsで公開しています。""",
        1,
    ),
    ('<span class="glitch cta">open →</span>', '<span class="glitch cta">開く →</span>', 3),
    # --- footer ---
    (">podcast</a", ">ポッドキャスト</a", 1),
    (
        "<div>© 2026 Jase Lindgren · Seattle, WA &amp; Osaka, Japan</div>",
        "<div>© 2026 Jase Lindgren · シアトル &amp; 大阪</div>",
        1,
    ),
]


def main() -> int:
    html = SRC.read_text(encoding="utf-8").replace("\r\n", "\n")
    bad = []
    for en, ja, want in PAIRS:
        got = html.count(en)
        if got != want:
            bad.append(f"expected {want}, found {got}: {en[:70]!r}")
            continue
        html = html.replace(en, ja)
    if bad:
        print("English page no longer matches the translation table:")
        print("\n".join("  " + b for b in bad))
        return 1
    DST.parent.mkdir(exist_ok=True)
    DST.write_text(html, encoding="utf-8", newline="\n")
    print(f"wrote {DST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
