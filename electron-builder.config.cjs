const productName = (name) => {
  const names = name.split('.')
  return names.map((name) => name).join(' ')
}

const { name, author } = require('./package.json')

const config = {
  appId: `com.${name}`,
  copyright: `Copyleft © ${new Date().getFullYear()} ${author}`,
  productName: productName(name),
  files: [
    '!**/.vscode/*',
    '!src/*',
    '!electron.vite.config.{js,ts,mjs,cjs}',
    '!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}',
    '!{.env,.env.*,.npmrc,pnpm-lock.yaml}',
    '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'
  ],
  directories: {
    buildResources: 'build'
  },
  asarUnpack: 'resources/**',
  //compression: 'maximum',
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,
  artifactName: '${name}-${version}-${os}-${arch}.${ext}',
  linux: {
    category: 'Utility',
    icon: '_icons/icon.svg',
    target: ['deb', 'zip', /*'7z', 'apk', 'rpm',*/ 'AppImage', 'pacman'],
    maintainer: author
  },
  nsis: {
    allowToChangeInstallationDirectory: true,
    oneClick: false
  },
  publish: false
}

module.exports = config
