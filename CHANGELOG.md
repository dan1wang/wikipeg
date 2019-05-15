# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.3] - 2019-04-25
- Simplify loops zero_or_more and one_or_more
- Fix caching of reference rule variables
- Fix for the `ast.initializer` format change
- Fix expectation sorting (PHP)
- Fix to error construction (PHP)

## [2.0.1] - 2019-03-28
- Fix visitor for new multiple initializer feature

## [2.0.0] - 2019-03-11
- **Added** PHP code generation mode
  <!-- 9dd57830c99ac3ee7820f5b02cd61c298117f393 -->

## [1.0.2] - 2019-03-11
- Chore

## [1.0.0] - 2019-03-01

* **Added** rule parameter feature.
  <!-- 127254e4ec3a6a1a04d4b356d37852dc9f2f447d -->
- **Added** stream rules
  <!-- 5eafcd3557c0e467041aa8760ba3924e1533a46b%5E%21 -->
- **Added** ability to use custom cache hook
  <!--5bcff4d718a1726e59431bb4f47faa0a3235dee1^!-->
- **New** single-pass JS generator backend
  <!-- 8ff8eaa40b1e23c862cdad083b5ccfc3822d6a46 -->
  - use an explicit register allocation approach (instead of a stack).
  - allows sharing of success and failure blocks between an AST node and
its children, eliminating some comparisons and branches.
  - uses labeled breaks to exit choice and sequence operators (instead
  of nested if blocks).
- Rebased from PEG.js and rebranded to WikiPEG

[Unreleased]: https://github.com/wikimedia/wikipeg/compare/0f5861f...HEAD
[2.0.3]: https://github.com/wikimedia/wikipeg/compare/4da5adc...0f5861f
[2.0.1]: https://github.com/wikimedia/wikipeg/compare/9dd5783...4da5adc
[2.0.0]: https://github.com/wikimedia/wikipeg/compare/4781250...9dd5783
[1.0.2]: https://github.com/wikimedia/wikipeg/compare/1b60d6e...4781250
[1.0.0]: https://gerrit.wikimedia.org/r/plugins/gitiles/wikipeg/+/1b60d6e75193673f220e5418fe16fc44657b770f/
