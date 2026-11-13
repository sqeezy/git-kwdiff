// Variant A — "Workbench": one dense column, sticky chrome, a real table of
// commits and one continuous patch. The shape of a tool you keep open.
import type { Html, HtmlBuilder } from 'foldkit/html'

import { diffLines, grouped, isSelected, matching, selectedCommits, totals } from '../lib'
import { Message } from '../message'
import type { Model } from '../model'

const paper = 'bg-[#f6f4ef] text-[#191712]'
const line = 'border-[#e3ded3]'
const muted = 'text-[#6f675c]'

const diffLineClass = (kind: string): string => {
  switch (kind) {
    case 'add':
      return 'bg-[#e6f2ea] text-[#0f5b43]'
    case 'del':
      return 'bg-[#fbe9e7] text-[#99302a]'
    case 'hunk':
      return 'bg-[#efece3] text-[#6f675c]'
    case 'file':
      return 'bg-[#e9e5da] font-semibold text-[#191712]'
    default:
      return 'text-[#453f35]'
  }
}

const rootBadge = (root: string): string =>
  root === 'legacy'
    ? 'bg-[#efe4cd] text-[#6f5212] border-[#e0cfae]'
    : 'bg-[#e2eee4] text-[#215c3b] border-[#c9ddd0]'

const checkbox = (on: boolean, h: HtmlBuilder<Message>) =>
  h.span(
    [
      h.Attribute('aria-hidden', 'true'),
      h.Class(
        `grid size-5 shrink-0 place-items-center rounded-[5px] border text-[12px] leading-none transition ${
          on
            ? 'border-[#191712] bg-[#191712] text-[#f6f4ef]'
            : 'border-[#c9c2b4] bg-white text-transparent'
        }`,
      ),
    ],
    ['✓'],
  )

export const VariantA = (model: Model, h: HtmlBuilder<Message>): Html => {
  const found = matching(model.keyword)
  const rows = grouped(found)
  const chosen = selectedCommits(model)
  const sum = totals(model)
  const allShown = found.length > 0 && found.every(commit => isSelected(model, commit.sha))

  return h.div([h.Class(`${paper} min-h-screen font-sans antialiased`)], [
    // ---- sticky chrome ---------------------------------------------------
    h.header(
      [h.Class(`sticky top-0 z-20 border-b ${line} bg-[#f6f4ef]/95 backdrop-blur`)],
      [
        h.div([h.Class('mx-auto flex max-w-4xl items-center gap-3 px-4 pt-3')], [
          h.span(
            [
              h.Class(
                'grid size-6 place-items-center rounded bg-[#191712] font-mono text-[11px] font-bold text-[#f6f4ef]',
              ),
            ],
            ['±'],
          ),
          h.span([h.Class('text-[15px] font-semibold tracking-tight')], ['git-kwdiff']),
          h.span(
            [
              h.Class(
                `rounded-full border ${line} bg-white px-2 py-0.5 font-mono text-[11px] ${muted}`,
              ),
            ],
            ['acme-api'],
          ),
          h.span([h.Class('ml-auto text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#6f675c]')], [
            'Prototype · A',
          ]),
        ]),
        h.div([h.Class('mx-auto flex max-w-4xl items-center gap-2 px-4 pb-3 pt-2.5')], [
          h.div([h.Class('relative flex-1')], [
            h.span([h.Class('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8173]')], [
              '⌕',
            ]),
            h.input([
              h.Attribute('type', 'text'),
              h.Attribute('placeholder', 'Search commit messages — ABC-123, retry, cache…'),
              h.Attribute('spellcheck', 'false'),
              h.Value(model.keyword),
              h.OnInput(value => Message.ChangedKeyword({ value })),
              h.Class(
                `w-full rounded-md border ${line} bg-white py-2.5 pl-8 pr-3 font-mono text-[13px] text-[#191712] outline-none placeholder:text-[#8a8173] focus:border-[#191712]`,
              ),
            ]),
          ]),
          h.button(
            [
              h.OnClick(Message.ToggledAll({ on: !allShown })),
              h.Attribute('data-kw', 'toggle-all'),
              h.Class(
                `rounded-md border ${line} bg-white px-3 py-2.5 text-[12px] font-medium text-[#4b4438] hover:border-[#191712]`,
              ),
            ],
            [allShown ? 'None' : 'All'],
          ),
        ]),
      ],
    ),

    // ---- commits ---------------------------------------------------------
    h.main([h.Class('mx-auto max-w-4xl px-4 pb-28 pt-2')], [
      h.div([h.Class('flex items-baseline justify-between px-1 py-2')], [
        h.span([h.Class(`text-[11px] font-medium ${muted}`)], ['Commits']),
        h.span([h.Class('font-mono text-[11px] text-[#6f675c]')], [
          `${chosen.length} of ${found.length} selected · ${sum.files} files · +${sum.added} −${sum.removed}`,
        ]),
      ]),
      h.ul([h.Class(`overflow-hidden rounded-lg border ${line} bg-white`)], [
        ...rows.flatMap(({ commit, startsRoot }) => {
          const on = isSelected(model, commit.sha)
          const added = commit.files.reduce((n, file) => n + file.added, 0)
          const removed = commit.files.reduce((n, file) => n + file.removed, 0)
          const row = h.li([h.Class(`border-b ${line} last:border-0`)], [
            h.button(
              [
                h.Attribute('role', 'checkbox'),
                h.Attribute('aria-checked', on ? 'true' : 'false'),
                h.OnClick(Message.ToggledCommit({ sha: commit.sha })),
                h.Class(
                  `flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[#fbfaf7] ${
                    on ? '' : 'opacity-55'
                  }`,
                ),
              ],
              [
                checkbox(on, h),
                h.span([h.Class('flex min-w-0 flex-1 flex-col')], [
                  h.span([h.Class('truncate text-[13px] leading-5')], [commit.subject]),
                  h.span([h.Class('flex flex-wrap items-center gap-x-1 font-mono text-[11px] text-[#6f675c]')], [
                    commit.sha,
                    h.span([h.Class('text-[#a8a091]')], ['·']),
                    h.span([h.Class('hidden sm:inline')], [commit.author]),
                    h.span([h.Class('hidden text-[#a8a091] sm:inline')], ['·']),
                    commit.date,
                  ]),
                ]),
                h.span(
                  [
                    h.Class(
                      `hidden shrink-0 rounded-full border px-1.5 py-px font-mono text-[10.5px] sm:inline ${rootBadge(
                        commit.root,
                      )}`,
                    ),
                  ],
                  [commit.root],
                ),
                h.span([h.Class('w-16 shrink-0 text-right font-mono text-[11px]')], [
                  h.span([h.Class('text-[#0f5b43]')], [`+${added}`]),
                  ' ',
                  h.span([h.Class('text-[#99302a]')], [`−${removed}`]),
                ]),
              ],
            ),
          ])
          return startsRoot
            ? [
                h.li([h.Class(`flex items-center gap-2 border-b ${line} bg-[#f1eee6] px-3 py-1`)], [
                  h.span([h.Class('h-px flex-1 bg-[#d8d1c2]')]),
                  h.span([h.Class('font-mono text-[10px] text-[#7c7365]')], [
                    'Unrelated history · no merge base',
                  ]),
                  h.span([h.Class('h-px flex-1 bg-[#d8d1c2]')]),
                ]),
                row,
              ]
            : [row]
        }),
      ]),

      // ---- the patch -----------------------------------------------------
      h.div([h.Class(`mt-6 overflow-hidden rounded-lg border ${line} bg-white`)], [
        h.div([h.Class(`flex items-center gap-2 border-b ${line} bg-[#fbfaf7] px-4 py-2`)], [
          h.span([h.Class('font-mono text-[11px] font-semibold text-[#191712]')], ['unified diff']),
          h.span([h.Class('font-mono text-[11px] text-[#6f675c]')], [
            `${sum.commits} commits · ${sum.files} files`,
          ]),
          h.span([h.Class('ml-auto font-mono text-[11px]')], [
            h.span([h.Class('text-[#0f5b43]')], [`+${sum.added}`]),
            ' ',
            h.span([h.Class('text-[#99302a]')], [`−${sum.removed}`]),
          ]),
        ]),
        chosen.length === 0
          ? h.p([h.Class('px-4 py-10 text-center text-[13px] text-[#6f675c]')], [
              'No commits selected — tick one above.',
            ])
          : h.pre(
              [h.Class('max-h-[46vh] overflow-auto py-1 font-mono text-[11.5px] leading-[1.55]')],
              chosen.flatMap(commit => [
                h.div([h.Class(`border-b ${line} bg-[#f7f5f0] px-4 py-1.5`)], [
                  h.span([h.Class('font-semibold text-[#191712]')], [commit.subject]),
                  h.span([h.Class('text-[#6f675c]')], [`  ${commit.sha}`]),
                ]),
                ...commit.files.flatMap(file => [
                  h.div([h.Class('px-4 pt-1.5 text-[#7c7365]')], [
                    `diff --git a/${file.path} b/${file.path}`,
                  ]),
                  ...diffLines(file.patch).map(entry =>
                    h.div([h.Class(`whitespace-pre px-4 ${diffLineClass(entry.kind)}`)], [entry.text]),
                  ),
                ]),
              ]),
            ),
      ]),
    ]),
  ])
}
