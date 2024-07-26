import Store from 'electron-store'

type StoreType = {
  currentProfile: number
  windowHeight: number
  windowWidth: number
}

const store = new Store<StoreType>({
  defaults: {
    currentProfile: 1,
    windowHeight: 670,
    windowWidth: 900
  }
})

export { store }
