export default defineTask({
  meta: {
    name: 'tmdb-import',
    description: 'Download and import the TMDB daily movie export into the local SQLite index',
  },
  async run() {
    const result = await runTmdbImport()
    return { result }
  },
})
