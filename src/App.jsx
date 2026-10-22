import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { 
  ShoppingBag, Sparkles, Calendar, Search, Plus, Minus, 
  Trash2, CheckCircle2, PhoneCall, MapPin, Clock, X, ChevronRight, ZoomIn, ChevronDown 
} from 'lucide-react'

const STORAGE_URL = 'https://ddgpwnxjkzhvrsouijcq.supabase.co/storage/v1/object/public/catalogo'
const WHATSAPP_NUMBER = '51947017401'
const PRODUCTOS_POR_PAGINA = 12

export default function App() {
  const [productos, setProductos] = useState([])
  const [servicios, setServicios] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaActiva, setCategoriaActiva] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [limiteVisible, setLimiteVisible] = useState(PRODUCTOS_POR_PAGINA)
  const [imagenAmpliada, setImagenAmpliada] = useState(null)
  const [carrito, setCarrito] = useState([])
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  // Reiniciar paginación al cambiar de categoría o buscar
  useEffect(() => {
    setLimiteVisible(PRODUCTOS_POR_PAGINA)
  }, [categoriaActiva, busqueda])

  async function cargarDatos() {
    setCargando(true)
    const [resCat, resProd, resServ] = await Promise.all([
      supabase.from('categorias').select('*').eq('activo', true).order('id'),
      supabase.from('productos').select('*, categorias(nombre)').eq('activo', true).order('destacado', { ascending: false }).order('id'),
      supabase.from('servicios').select('*').eq('activo', true).order('id')
    ])

    if (resCat.data) setCategorias(resCat.data)
    if (resProd.data) setProductos(resProd.data)
    if (resServ.data) setServicios(resServ.data)
    setCargando(false)
  }

  const obtenerImagenProducto = (prod) => {
    if (prod.imagen_url) return prod.imagen_url
    return `${STORAGE_URL}/logo.jpg`
  }

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === producto.id)
      if (existe) {
        return prev.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, cantidad: item.cantidad + delta } : item))
        .filter((item) => item.cantidad > 0)
    )
  }

  const totalCarrito = carrito.reduce((acc, item) => acc + Number(item.precio) * item.cantidad, 0)
  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0)

  const enviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return
    const lineas = carrito.map(
      (item) => `• ${item.cantidad}x ${item.nombre} (${item.marca || 'Jean Nails'}) - S/ ${(item.precio * item.cantidad).toFixed(2)}`
    )
    const mensaje = `¡Hola *Jean Nails Store*! 🛍️💅 Quiero realizar el siguiente pedido de insumos:\n\n${lineas.join('\n')}\n\n*Total a pagar: S/ ${totalCarrito.toFixed(2)}*\n\n¿Me confirman disponibilidad y métodos de pago?`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const reservarServicioWhatsApp = (servicioNombre = 'un servicio de uñas') => {
    const mensaje = `¡Hola *Jean Nails Store*! ✨ Deseo reservar una cita en el salón para *${servicioNombre}*. ¿Qué horarios tienen disponibles?`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const categoriasInsumos = ['Todos', ...categorias.filter((c) => c.tipo === 'insumo').map((c) => c.nombre)]
  const productosFiltrados = productos.filter((p) => {
    const coincideCategoria = categoriaActiva === 'Todos' || p.categorias?.nombre === categoriaActiva
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                             (p.marca && p.marca.toLowerCase().includes(busqueda.toLowerCase())) ||
                             (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
    return coincideCategoria && coincideBusqueda
  })

  const productosMostrados = productosFiltrados.slice(0, limiteVisible)

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3">
            <img 
              src={`${STORAGE_URL}/logo.jpg`} 
              onError={(e) => { e.target.style.display = 'none' }}
              alt="Jean Nails Store" 
              className="h-12 w-12 rounded-full object-cover border-2 border-pink-500 shadow-xs"
            />
            <div>
              <span className="text-xl font-extrabold tracking-tight text-pink-600 block leading-none">
                JEAN NAILS
              </span>
              <span className="text-xs font-semibold tracking-widest text-stone-400 uppercase">
                Store & Salón
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <a href="#inicio" className="hover:text-pink-600 transition">Inicio</a>
            <a href="#insumos" className="hover:text-pink-600 transition">Tienda de Insumos</a>
            <a href="#servicios" className="hover:text-pink-600 transition">Salón & Uñas</a>
            <a href="#nosotros" className="hover:text-pink-600 transition">Nosotros</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => reservarServicioWhatsApp()}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border border-pink-600 text-pink-600 hover:bg-pink-50 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Reservar cita
            </button>

            <button
              onClick={() => setCarritoAbierto(true)}
              className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 transition shadow-sm cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Mi Pedido</span>
              {totalItems > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-white text-pink-600 rounded-full">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="inicio" className="relative overflow-hidden bg-gradient-to-br from-pink-600 via-pink-500 to-rose-400 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Insumos Profesionales & Salón de Uñas
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Todo para el arte en tus uñas en un solo lugar.
            </h1>
            <p className="text-pink-50 text-lg max-w-xl leading-relaxed">
              Somos tu tienda especializada en insumos profesionales de las mejores marcas y centro de estilismo de uñas. Calidad garantizada para profesionales y amantes de la belleza.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="#insumos"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-pink-600 font-bold shadow-lg hover:bg-pink-50 transition"
              >
                <ShoppingBag className="w-5 h-5" />
                Ver Catálogo ({productos.length} Productos)
              </a>
              <a
                href="#servicios"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-pink-700/60 text-white font-semibold border border-white/30 hover:bg-pink-700 transition"
              >
                <Calendar className="w-5 h-5" />
                Servicios de Salón
              </a>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30 bg-pink-500">
              <img
                src={`${STORAGE_URL}/logo.jpg`}
                alt="Jean Nails Store Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 1: CATÁLOGO DE INSUMOS */}
      <section id="insumos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div>
            <span className="text-pink-600 font-bold text-sm uppercase tracking-wider">Catálogo Online</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1">
              Tienda de Insumos Profesionales
            </h2>
            <p className="text-stone-500 mt-2">
              Mostrando {productosMostrados.length} de {productosFiltrados.length} productos disponibles.
            </p>
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-80">
            <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar acrílico, rubber, pincel, marca..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-11 pr-9 py-2.5 bg-white border border-stone-200 rounded-full text-sm focus:outline-none focus:border-pink-500 shadow-2xs"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros de Categoría */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categoriasInsumos.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer ${
                categoriaActiva === cat
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-pink-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grilla de Productos */}
        {cargando ? (
          <div className="text-center py-16 text-stone-400">Cargando catálogo desde la nube...</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-100">
            <p className="text-stone-500 font-medium">No encontramos insumos que coincidan con tu búsqueda.</p>
            <button
              onClick={() => { setBusqueda(''); setCategoriaActiva('Todos'); }}
              className="mt-4 px-5 py-2 rounded-full bg-pink-50 text-pink-600 text-sm font-bold hover:bg-pink-100 cursor-pointer"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
              {productosMostrados.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-stone-100 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col group"
                >
                  <div 
                    onClick={() => setImagenAmpliada(prod)}
                    className="relative h-64 bg-stone-100 overflow-hidden cursor-zoom-in"
                  >
                    <img
                      src={obtenerImagenProducto(prod)}
                      onError={(e) => { e.target.src = `${STORAGE_URL}/logo.jpg` }}
                      alt={prod.nombre}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {prod.marca && (
                      <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-pink-600 text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                        {prod.marca}
                      </span>
                    )}
                    <div className="absolute bottom-3 right-3 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-stone-400 font-medium">
                        {prod.categorias?.nombre || 'Insumos'}
                      </span>
                      <h3 className="font-bold text-stone-900 text-lg mt-0.5 leading-snug">
                        {prod.nombre}
                      </h3>
                      <p className="text-stone-500 text-sm mt-2 line-clamp-2">
                        {prod.descripcion}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-stone-400 block">Precio</span>
                        <span className="text-xl font-extrabold text-pink-600">
                          S/ {Number(prod.precio).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => agregarAlCarrito(prod)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-pink-600 transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Agregar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón Cargar Más */}
            {limiteVisible < productosFiltrados.length && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => setLimiteVisible((prev) => prev + PRODUCTOS_POR_PAGINA)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white border-2 border-pink-600 text-pink-600 font-bold hover:bg-pink-600 hover:text-white transition shadow-xs cursor-pointer"
                >
                  <span>Ver más productos ({productosFiltrados.length - limiteVisible} restantes)</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* SECCIÓN 2: SERVICIOS DE SALÓN */}
      <section id="servicios" className="bg-white py-20 border-y border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-pink-600 font-bold text-sm uppercase tracking-wider">
              Experiencia en Salón
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1">
              Nuestros Servicios de Uñas & Belleza
            </h2>
            <p className="text-stone-500 mt-3">
              Déjate consentir por especialistas utilizando los mejores productos profesionales del mercado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {servicios.map((serv) => (
              <div
                key={serv.id}
                className="p-8 rounded-3xl bg-gradient-to-br from-pink-50/70 to-white border border-pink-100 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold">
                      Duración aprox: {serv.duracion_aprox || '60 min'}
                    </span>
                    <span className="text-lg font-extrabold text-pink-600">
                      Desde S/ {Number(serv.precio_desde).toFixed(2)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900 mt-4">{serv.nombre}</h3>
                  <p className="text-stone-600 mt-2 leading-relaxed">{serv.descripcion}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-pink-100/80 flex justify-end">
                  <button
                    onClick={() => reservarServicioWhatsApp(serv.nombre)}
                    className="inline-flex items-center gap-2 text-pink-600 font-bold hover:text-pink-700 cursor-pointer"
                  >
                    Reservar cita para este servicio <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: ACERCA DE NOSOTROS */}
      <section id="nosotros" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-stone-900 text-white rounded-3xl p-8 sm:p-14 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <span className="text-pink-400 font-bold text-sm uppercase tracking-wider">
              Acerca de Nosotros
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
              Calidad profesional y tendencia en cada detalle
            </h2>
            <p className="text-stone-300 leading-relaxed">
              En <strong>Jean Nails Store</strong> nacimos con el compromiso de proveer a las manicuristas y amantes de las uñas los mejores acrílicos, covers, glitters y herramientas de trabajo, sumando ahora nuestra propia área de atención en salón.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0" />
                <span className="text-sm text-stone-200">Stock real y marcas originales</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0" />
                <span className="text-sm text-stone-200">Atención personalizada</span>
              </div>
            </div>
          </div>

          <div className="bg-stone-800/90 p-8 rounded-2xl border border-stone-700 space-y-5">
            <h3 className="text-xl font-bold text-white">¿Lista para hacer tu pedido o agendar cita?</h3>
            <p className="text-stone-400 text-sm">
              Escríbenos directamente para asesorarte con tus insumos o reservar tu espacio en nuestro salón.
            </p>
            <div className="space-y-3 text-sm text-stone-300">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-pink-500" />
                <span>Lunes a Sábado: 9:00 AM - 8:00 PM</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-pink-500" />
                <span>Envíos a todo el país y recojo en tienda</span>
              </div>
            </div>
            <button
              onClick={() => reservarServicioWhatsApp('atención en tienda / salón')}
              className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" /> Contactar por WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-10 text-center text-sm text-stone-500">
        <p>© {new Date().getFullYear()} <strong>Jean Nails Store</strong>. Todos los derechos reservados.</p>
      </footer>

      {/* MODAL DE IMAGEN AMPLIADA (LIGHTBOX) */}
      {imagenAmpliada && (
        <div 
          onClick={() => setImagenAmpliada(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl"
          >
            <div className="relative h-96 bg-stone-100">
              <img
                src={obtenerImagenProducto(imagenAmpliada)}
                alt={imagenAmpliada.nombre}
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setImagenAmpliada(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-pink-600 uppercase">{imagenAmpliada.marca}</span>
                <h3 className="text-lg font-extrabold text-stone-900">{imagenAmpliada.nombre}</h3>
                <p className="text-xl font-extrabold text-pink-600 mt-1">
                  S/ {Number(imagenAmpliada.precio).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => { agregarAlCarrito(imagenAmpliada); setImagenAmpliada(null); }}
                className="px-5 py-3 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-700 transition cursor-pointer shrink-0"
              >
                + Agregar al pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARRITO LATERAL (DRAWER) */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-pink-600" />
                <h3 className="font-extrabold text-lg text-stone-900">Tu Pedido de Insumos</h3>
              </div>
              <button
                onClick={() => setCarritoAbierto(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-20 text-stone-400">
                  Tu bolsa de compras está vacía.
                </div>
              ) : (
                carrito.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl border border-stone-100">
                    <img
                      src={obtenerImagenProducto(item)}
                      alt={item.nombre}
                      className="w-16 h-16 rounded-lg object-cover bg-stone-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-stone-900 truncate">{item.nombre}</h4>
                      <span className="text-xs text-pink-600 font-bold">
                        S/ {(item.precio * item.cantidad).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => cambiarCantidad(item.id, -1)}
                          className="p-1 rounded-md bg-stone-100 hover:bg-stone-200 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{item.cantidad}</span>
                        <button
                          onClick={() => cambiarCantidad(item.id, 1)}
                          className="p-1 rounded-md bg-stone-100 hover:bg-stone-200 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => cambiarCantidad(item.id, -item.cantidad)}
                      className="text-stone-400 hover:text-red-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {carrito.length > 0 && (
              <div className="p-6 border-t border-stone-100 bg-stone-50 space-y-4">
                <div className="flex items-center justify-between text-lg font-extrabold">
                  <span>Total Estimado:</span>
                  <span className="text-pink-600">S/ {totalCarrito.toFixed(2)}</span>
                </div>
                <button
                  onClick={enviarPedidoWhatsApp}
                  className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-md transition cursor-pointer"
                >
                  Enviar Pedido por WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}