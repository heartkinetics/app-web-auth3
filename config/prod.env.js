'use strict'
module.exports = {
  NODE_ENV: '"production"',
  KINO_RESEARCH_API: process.env.KINO_RESEARCH_API ? `'${process.env.KINO_RESEARCH_API}'` : '"https://kino-research-uhcjixolra-ew.a.run.app"',
  KINO_CORE_API: process.env.KINO_CORE_API ? `'${process.env.KINO_CORE_API}'` : '"https://kino-core-pryv-uhcjixolra-ew.a.run.app"'
}
