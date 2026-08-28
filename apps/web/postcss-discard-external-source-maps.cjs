module.exports = {
  postcssPlugin: 'discard-external-source-map-references',
  Comment(comment) {
    if (/^# sourceMappingURL=.*\.map\s*$/.test(comment.text.trim())) {
      comment.remove()
    }
  },
}
