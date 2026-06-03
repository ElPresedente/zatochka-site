const CART_KEY = 'ostriy_kray_cart'

export interface CartItemService {
  id: string
  name: string
  price: number
}

export interface CartItem {
  cartKey: string       // "productId" or "productId:svcId1,svcId2"
  id: number            // productId
  name: string
  price: number         // unitPrice incl. services
  photo: string
  qty: number
  stock?: number
  services: CartItemService[]
}

export function makeCartKey(productId: number, serviceIds: string[]): string {
  if (!serviceIds.length) return String(productId)
  return `${productId}:${[...serviceIds].sort().join(',')}`
}

export function useCart() {
  const cart = useState<CartItem[]>('cart.items', () => [])
  const loaded = useState<boolean>('cart.loaded', () => false)

  function loadCart() {
    if (!import.meta.client || loaded.value) return
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]')
      cart.value = (Array.isArray(raw) ? raw : []).map((item: any) => ({
        ...item,
        cartKey: item.cartKey ?? String(item.id),
        services: item.services ?? [],
      }))
    }
    catch {
      cart.value = []
    }
    loaded.value = true
  }

  function saveCart() {
    if (!import.meta.client) return
    localStorage.setItem(CART_KEY, JSON.stringify(cart.value))
  }

  onMounted(loadCart)

  const totalQty = computed(() => cart.value.reduce((s, i) => s + i.qty, 0))
  const totalPrice = computed(() => cart.value.reduce((s, i) => s + i.price * i.qty, 0))

  function addToCart(
    product: { id: number; name: string; price: number; photos: string[]; stock: number },
    selectedServices: CartItemService[] = [],
  ) {
    const cartKey = makeCartKey(product.id, selectedServices.map(s => s.id))
    const servicesTotal = selectedServices.reduce((s, sv) => s + sv.price, 0)
    const unitPrice = product.price + servicesTotal

    const existing = cart.value.find(i => i.cartKey === cartKey)
    if (existing) {
      existing.stock = product.stock
      existing.qty = Math.min(existing.qty + 1, product.stock)
    }
    else {
      if (product.stock <= 0) return
      cart.value.push({
        cartKey,
        id: product.id,
        name: product.name,
        price: unitPrice,
        photo: product.photos[0] ?? '',
        qty: 1,
        stock: product.stock,
        services: selectedServices,
      })
    }
    saveCart()
  }

  function removeFromCart(cartKey: string) {
    cart.value = cart.value.filter(i => i.cartKey !== cartKey)
    saveCart()
  }

  function setQty(cartKey: string, qty: number, maxQty?: number) {
    if (qty <= 0) { removeFromCart(cartKey); return }
    const item = cart.value.find(i => i.cartKey === cartKey)
    if (item) {
      if (maxQty !== undefined) item.stock = maxQty
      const limit = maxQty ?? item.stock
      item.qty = limit === undefined ? qty : Math.min(qty, limit)
      saveCart()
    }
  }

  // availableServicesById: Map<productId, available services for that product>
  function applyServicesToAll(
    selectedServices: CartItemService[],
    availableServicesById: Map<number, CartItemService[]>,
  ) {
    const updated: CartItem[] = []

    for (const item of cart.value) {
      const available = availableServicesById.get(item.id)
      if (available == null) { updated.push(item); continue }

      const applicable = selectedServices.filter(s => available.some(a => a.id === s.id))
      const newKey = makeCartKey(item.id, applicable.map(s => s.id))
      const basePrice = item.price - item.services.reduce((s, sv) => s + sv.price, 0)
      const newPrice = basePrice + applicable.reduce((s, sv) => s + sv.price, 0)

      const existingIdx = updated.findIndex(i => i.cartKey === newKey)
      if (existingIdx >= 0) {
        updated[existingIdx].qty = Math.min(updated[existingIdx].qty + item.qty, item.stock ?? Infinity)
      }
      else {
        updated.push({ ...item, cartKey: newKey, services: applicable, price: newPrice })
      }
    }

    cart.value = updated
    saveCart()
  }

  function clearCart() {
    cart.value = []
    saveCart()
  }

  return { cart, totalQty, totalPrice, addToCart, applyServicesToAll, removeFromCart, setQty, clearCart }
}
