const CART_KEY = 'ostriy_kray_cart'

export interface CartItem {
  id: number
  name: string
  price: number
  photo: string
  qty: number
}

const cart = ref<CartItem[]>([])

function loadCart() {
  if (!import.meta.client) return
  try {
    cart.value = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]')
  } catch {
    cart.value = []
  }
}

function saveCart() {
  if (!import.meta.client) return
  localStorage.setItem(CART_KEY, JSON.stringify(cart.value))
}

export function useCart() {
  onMounted(loadCart)

  const totalQty = computed(() => cart.value.reduce((s, i) => s + i.qty, 0))
  const totalPrice = computed(() => cart.value.reduce((s, i) => s + i.price * i.qty, 0))

  function addToCart(product: { id: number; name: string; price: number; photos: string[] }) {
    const existing = cart.value.find(i => i.id === product.id)
    if (existing) {
      existing.qty++
    } else {
      cart.value.push({
        id: product.id,
        name: product.name,
        price: product.price,
        photo: product.photos[0] ?? '',
        qty: 1,
      })
    }
    saveCart()
  }

  function removeFromCart(id: number) {
    cart.value = cart.value.filter(i => i.id !== id)
    saveCart()
  }

  function setQty(id: number, qty: number) {
    if (qty <= 0) { removeFromCart(id); return }
    const item = cart.value.find(i => i.id === id)
    if (item) { item.qty = qty; saveCart() }
  }

  function clearCart() {
    cart.value = []
    saveCart()
  }

  return { cart, totalQty, totalPrice, addToCart, removeFromCart, setQty, clearCart }
}
