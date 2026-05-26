"""
Database seed script for Food Store — datos completos y realistas.

Idempotente: puede correrse múltiples veces sin duplicar datos.

Usage (desde backend/):
    python scripts/seed.py
"""
import asyncio
import sys
from decimal import Decimal
from pathlib import Path
from typing import Optional, Tuple, Type, TypeVar

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

from core.database import engine, async_session_local
from core.models import (
    Categoria,
    Configuracion,
    EstadoPedido,
    FormaPago,
    Ingrediente,
    Producto,
    ProductoCategoria,
    ProductoIngrediente,
    Rol,
    Usuario,
    UsuarioRol,
)
from core.security import hash_password

T = TypeVar("T", bound=SQLModel)


async def get_or_create(
    session: AsyncSession,
    model: Type[T],
    filter_by: dict,
    create_data: Optional[dict] = None,
) -> Tuple[T, bool]:
    """Generic get-or-create. Returns (instance, created_bool)."""
    stmt = select(model)
    for key, val in filter_by.items():
        stmt = stmt.where(getattr(model, key) == val)
    result = await session.execute(stmt)
    existing = result.scalars().first()
    if existing:
        return existing, False
    obj = model(**{**filter_by, **(create_data or {})})
    session.add(obj)
    await session.flush()
    return obj, True


async def seed_database() -> None:
    print("\n" + "=" * 60)
    print("[SEED] Food Store — iniciando seed completo...")
    print("=" * 60)

    async with async_session_local() as session:

        # ──────────────────────────────────────────────────────────
        # ROLES  (IDs estables: ADMIN=1, STOCK=2, PEDIDOS=3, CLIENT=4)
        # ──────────────────────────────────────────────────────────
        print("\n[ROLES]")
        roles_spec = [
            ("ADMIN",   "Administrador del sistema con acceso total"),
            ("STOCK",   "Administrador de stock e inventario"),
            ("PEDIDOS", "Encargado de gestión de pedidos"),
            ("CLIENT",  "Cliente de la tienda"),
        ]
        roles: dict[str, Rol] = {}
        for nombre, desc in roles_spec:
            rol, created = await get_or_create(
                session, Rol, {"nombre": nombre}, {"descripcion": desc}
            )
            roles[nombre] = rol
            print(f"  {'[CREATE]' if created else '[EXISTS]'} {nombre} (id={rol.id})")

        # ──────────────────────────────────────────────────────────
        # ESTADOS PEDIDO
        # ──────────────────────────────────────────────────────────
        print("\n[ESTADOS PEDIDO]")
        estados_spec = [
            ("PENDIENTE",       "Pedido creado, en espera de confirmación de pago"),
            ("CONFIRMADO",      "Pago confirmado, listo para preparar"),
            ("EN_PREPARACIÓN",  "Siendo preparado en cocina"),
            ("EN_CAMINO",       "En camino hacia el cliente"),
            ("ENTREGADO",       "Entregado exitosamente"),
            ("CANCELADO",       "Pedido cancelado"),
        ]
        for nombre, desc in estados_spec:
            estado, created = await get_or_create(
                session, EstadoPedido, {"nombre": nombre}, {"descripcion": desc}
            )
            print(f"  {'[CREATE]' if created else '[EXISTS]'} {nombre} (id={estado.id})")

        # ──────────────────────────────────────────────────────────
        # FORMAS DE PAGO
        # ──────────────────────────────────────────────────────────
        print("\n[FORMAS DE PAGO]")
        formas_spec = [
            ("EFECTIVO",     "Pago en efectivo al recibir el pedido"),
            ("MERCADOPAGO",  "Pago a través de MercadoPago (tarjeta, débito, QR)"),
            ("TARJETA",      "Tarjeta de crédito o débito directo"),
        ]
        for nombre, desc in formas_spec:
            forma, created = await get_or_create(
                session, FormaPago, {"nombre": nombre}, {"descripcion": desc, "activo": True}
            )
            print(f"  {'[CREATE]' if created else '[EXISTS]'} {nombre} (id={forma.id})")

        # ──────────────────────────────────────────────────────────
        # USUARIOS
        # ──────────────────────────────────────────────────────────
        print("\n[USUARIOS]")
        users_spec = [
            ("admin@foodstore.com",   "Admin",  "Sistema",   "admin123456",   "ADMIN"),
            ("stock@foodstore.com",   "Carlos", "Inventario","stock123456",   "STOCK"),
            ("pedidos@foodstore.com", "María",  "Pedidos",   "pedidos123456", "PEDIDOS"),
            ("cliente@foodstore.com", "Juan",   "García",    "cliente123456", "CLIENT"),
            ("cliente2@foodstore.com","Ana",    "López",     "cliente123456", "CLIENT"),
        ]
        for email, nombre, apellido, password, rol_name in users_spec:
            usuario, created = await get_or_create(
                session, Usuario, {"email": email},
                {
                    "nombre": nombre,
                    "apellido": apellido,
                    "hashed_password": hash_password(password),
                    "activo": True,
                },
            )
            if created:
                ur = UsuarioRol(usuario_id=usuario.id, rol_id=roles[rol_name].id)
                session.add(ur)
                await session.flush()
            print(f"  {'[CREATE]' if created else '[EXISTS]'} {email} / {password}  ->  {rol_name}")

        # ──────────────────────────────────────────────────────────
        # CATEGORÍAS (padre + subcategorías)
        # ──────────────────────────────────────────────────────────
        print("\n[CATEGORÍAS]")
        # Padres
        c_pizzas,  _ = await get_or_create(session, Categoria, {"nombre": "Pizzas"},
                                            {"descripcion": "Pizzas artesanales al horno de piedra"})
        c_hambur,  _ = await get_or_create(session, Categoria, {"nombre": "Hamburguesas"},
                                            {"descripcion": "Hamburguesas gourmet con pan brioche"})
        c_bebidas, _ = await get_or_create(session, Categoria, {"nombre": "Bebidas"},
                                            {"descripcion": "Bebidas frías y calientes"})
        c_postres, _ = await get_or_create(session, Categoria, {"nombre": "Postres"},
                                            {"descripcion": "Postres caseros y helados artesanales"})

        # Hijos
        c_clasicas,  _ = await get_or_create(session, Categoria, {"nombre": "Pizzas Clásicas"},
                                              {"descripcion": "Recetas tradicionales italianas", "padre_id": c_pizzas.id})
        c_especiales,_ = await get_or_create(session, Categoria, {"nombre": "Pizzas Especiales"},
                                              {"descripcion": "Creaciones del chef", "padre_id": c_pizzas.id})
        c_combos,    _ = await get_or_create(session, Categoria, {"nombre": "Combos"},
                                              {"descripcion": "Hamburguesa + bebida a precio especial", "padre_id": c_hambur.id})
        c_gaseosas,  _ = await get_or_create(session, Categoria, {"nombre": "Gaseosas"},
                                              {"descripcion": "Gaseosas bien frías", "padre_id": c_bebidas.id})
        c_cervezas,  _ = await get_or_create(session, Categoria, {"nombre": "Cervezas"},
                                              {"descripcion": "Cervezas artesanales locales", "padre_id": c_bebidas.id})
        c_helados,   _ = await get_or_create(session, Categoria, {"nombre": "Helados"},
                                              {"descripcion": "Helados artesanales de estación", "padre_id": c_postres.id})

        all_cats = [c_pizzas, c_hambur, c_bebidas, c_postres,
                    c_clasicas, c_especiales, c_combos, c_gaseosas, c_cervezas, c_helados]
        for cat in all_cats:
            padre = f" (padre_id={cat.padre_id})" if cat.padre_id else ""
            print(f"  [OK] {cat.nombre} (id={cat.id}){padre}")

        # ──────────────────────────────────────────────────────────
        # INGREDIENTES
        # ──────────────────────────────────────────────────────────
        print("\n[INGREDIENTES]")
        ingredientes_spec = [
            # (nombre,               es_alergeno)  — alergeno = True
            ("Mozzarella",           True),   # lácteo
            ("Queso Cheddar",        True),   # lácteo
            ("Queso Provolone",      True),   # lácteo
            ("Harina de Trigo",      True),   # gluten
            ("Salsa de Tomate",      False),
            ("Pepperoni",            False),
            ("Jamón Cocido",         False),
            ("Champiñones",          False),
            ("Pimiento Rojo",        False),
            ("Cebolla",              False),
            ("Lechuga",              False),
            ("Tomate",               False),
            ("Mayonesa",             True),   # huevo
            ("Mostaza",              False),
            ("Ketchup",              False),
            ("Carne Vacuna",         False),
            ("Pollo Grillado",       False),
            ("Bacon Ahumado",        False),
            ("Huevo",                True),   # huevo
            ("Nueces",               True),   # frutos secos
            ("Maní",                 True),   # frutos secos
            ("Leche",                True),   # lácteo
            ("Mariscos",             True),   # mariscos
            ("Camarones",            True),   # mariscos
            ("Maíz",                 False),
        ]
        ings: dict[str, Ingrediente] = {}
        for nombre, es_alergeno in ingredientes_spec:
            ing, created = await get_or_create(
                session, Ingrediente, {"nombre": nombre}, {"es_alergeno": es_alergeno}
            )
            ings[nombre] = ing
            tag = "[ALERG]" if es_alergeno else "       "
            print(f"  {tag} {'[CREATE]' if created else '[EXISTS]'} {nombre}")

        # ──────────────────────────────────────────────────────────
        # PRODUCTOS
        # (nombre, descripcion, precio, stock, [cats], [(ing, es_removible)], imagen_url)
        # ──────────────────────────────────────────────────────────
        print("\n[PRODUCTOS]")
        productos_spec = [
            (
                "Pizza Margherita",
                "La clásica napolitana: salsa de tomate, mozzarella y albahaca fresca.",
                Decimal("2800.00"), 50,
                [c_clasicas],
                [("Harina de Trigo", False), ("Salsa de Tomate", False), ("Mozzarella", True)],
                "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80",
            ),
            (
                "Pizza Pepperoni",
                "Abundante pepperoni importado con doble mozzarella.",
                Decimal("3200.00"), 40,
                [c_clasicas],
                [("Harina de Trigo", False), ("Salsa de Tomate", False),
                 ("Mozzarella", True), ("Pepperoni", True)],
                "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80",
            ),
            (
                "Pizza 4 Quesos",
                "Mozzarella, cheddar, provolone y parmesano sobre base blanca.",
                Decimal("3500.00"), 30,
                [c_especiales],
                [("Harina de Trigo", False), ("Mozzarella", True),
                 ("Queso Cheddar", True), ("Queso Provolone", True)],
                "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80",
            ),
            (
                "Pizza Fugazzeta",
                "Pizza de cebolla con abundante mozzarella. Un clásico porteño.",
                Decimal("3000.00"), 35,
                [c_clasicas],
                [("Harina de Trigo", False), ("Mozzarella", True), ("Cebolla", True)],
                "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80",
            ),
            (
                "Pizza Napolitana",
                "Salsa de tomate, mozzarella y rodajas de tomate fresco con orégano.",
                Decimal("3100.00"), 35,
                [c_especiales],
                [("Harina de Trigo", False), ("Salsa de Tomate", False),
                 ("Mozzarella", True), ("Tomate", True)],
                "https://images.unsplash.com/photo-1551183053-bf91798d773e?w=400&q=80",
            ),
            (
                "Pizza Marinera",
                "Base de salsa de tomate, mariscos frescos y camarones salteados.",
                Decimal("3900.00"), 20,
                [c_especiales],
                [("Harina de Trigo", False), ("Salsa de Tomate", False),
                 ("Mariscos", True), ("Camarones", True)],
                "https://images.unsplash.com/photo-1619947583690-c2c9d5f97ed2?w=400&q=80",
            ),
            (
                "Hamburguesa Clásica",
                "200g de carne vacuna, lechuga, tomate, cebolla y ketchup casero.",
                Decimal("1800.00"), 60,
                [c_hambur],
                [("Carne Vacuna", False), ("Lechuga", True),
                 ("Tomate", True), ("Cebolla", True), ("Ketchup", True)],
                "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
            ),
            (
                "Hamburguesa Doble Cheddar",
                "Doble medallón de carne, doble cheddar derretido y bacon crocante.",
                Decimal("2600.00"), 40,
                [c_hambur],
                [("Carne Vacuna", False), ("Queso Cheddar", True),
                 ("Bacon Ahumado", True), ("Lechuga", True), ("Mayonesa", True)],
                "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80",
            ),
            (
                "Hamburguesa de Pollo",
                "Pechuga de pollo grillado, mayonesa de la casa, lechuga y tomate.",
                Decimal("1900.00"), 50,
                [c_hambur],
                [("Pollo Grillado", False), ("Lechuga", True),
                 ("Tomate", True), ("Mayonesa", True)],
                "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&q=80",
            ),
            (
                "Combo Burger + Gaseosa",
                "Hamburguesa clásica más gaseosa 500ml. Precio especial.",
                Decimal("2400.00"), 30,
                [c_combos, c_hambur],
                [("Carne Vacuna", False), ("Lechuga", True),
                 ("Tomate", True), ("Ketchup", True)],
                "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&q=80",
            ),
            (
                "Coca-Cola 500ml",
                "Gaseosa refrescante bien fría. Clásico de siempre.",
                Decimal("600.00"), 200,
                [c_gaseosas, c_bebidas],
                [],
                "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80",
            ),
            (
                "Sprite 500ml",
                "Lima limón sin azúcar, ideal para acompañar cualquier plato.",
                Decimal("600.00"), 200,
                [c_gaseosas, c_bebidas],
                [],
                "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80",
            ),
            (
                "Cerveza Artesanal IPA",
                "IPA artesanal local 500ml, notas cítricas y amargor equilibrado.",
                Decimal("1400.00"), 60,
                [c_cervezas, c_bebidas],
                [],
                "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80",
            ),
            (
                "Helado Doble Sabor",
                "Dos bochas de helado artesanal a elección. Cubierta opcional.",
                Decimal("900.00"), 80,
                [c_helados, c_postres],
                [("Leche", False)],
                "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&q=80",
            ),
            (
                "Brownie con Helado",
                "Brownie de chocolate negro tibio con bocha de helado de vainilla.",
                Decimal("1400.00"), 25,
                [c_postres, c_helados],
                [("Harina de Trigo", False), ("Huevo", False),
                 ("Leche", False), ("Nueces", True)],
                "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&q=80",
            ),
        ]

        for nombre, desc, precio, stock, categorias, ing_rel, imagen_url in productos_spec:
            prod, created = await get_or_create(
                session, Producto, {"nombre": nombre},
                {
                    "descripcion": desc,
                    "precio_base": precio,
                    "stock_cantidad": stock,
                    "disponible": True,
                    "imagen_url": imagen_url,
                },
            )
            if created:
                for cat in categorias:
                    session.add(ProductoCategoria(producto_id=prod.id, categoria_id=cat.id))
                for ing_nombre, es_removible in ing_rel:
                    ing = ings.get(ing_nombre)
                    if ing:
                        session.add(ProductoIngrediente(
                            producto_id=prod.id,
                            ingrediente_id=ing.id,
                            es_removible=es_removible,
                        ))
                await session.flush()
            print(f"  {'[CREATE]' if created else '[EXISTS]'} {nombre:<35} ${precio}  stock={stock}")

        # ──────────────────────────────────────────────────────────
        # UPDATE IMAGEN_URL — idempotent update for existing rows
        # Sets imagen_url on products that were seeded without it.
        # ──────────────────────────────────────────────────────────
        print("\n[UPDATE IMAGEN_URL]")
        imagen_url_map = {
            nombre: imagen_url
            for nombre, _, _, _, _, _, imagen_url in productos_spec
        }
        updated_count = 0
        for nombre, imagen_url in imagen_url_map.items():
            result = await session.execute(
                text("UPDATE productos SET imagen_url = :url WHERE nombre = :nombre AND imagen_url IS NULL"),
                {"url": imagen_url, "nombre": nombre},
            )
            if result.rowcount > 0:
                updated_count += 1
                print(f"  [UPDATED] {nombre}")
        if updated_count == 0:
            print("  [OK] All products already have imagen_url")

        # ──────────────────────────────────────────────────────────
        # CONFIGURACIONES (sistema key-value)
        # ──────────────────────────────────────────────────────────
        print("\n[CONFIGURACIONES]")
        admin_user = roles["ADMIN"]  # Reutilizar admin user que creamos antes
        # Obtener el ID del admin user
        admin_stmt = select(Usuario).where(Usuario.email == "admin@foodstore.com")
        admin_result = await session.execute(admin_stmt)
        admin_user_obj = admin_result.scalars().first()
        
        if admin_user_obj:
            configuraciones_spec = [
                ("envio_gratis_umbral", "3000", "Monto mínimo para envío gratis (en pesos)"),
                ("token_expiracion_minutos", "30", "Tiempo de expiración del access token en minutos"),
                ("refresh_token_expiracion_dias", "7", "Tiempo de expiración del refresh token en días"),
                ("pedidos_rate_limit_por_hora", "10", "Máximo de pedidos por usuario por hora"),
                ("productos_por_pagina", "12", "Cantidad de productos por página en catálogo"),
            ]
            
            for clave, valor, descripcion in configuraciones_spec:
                config, created = await get_or_create(
                    session, Configuracion, {"clave": clave},
                    {
                        "valor": valor,
                        "descripcion": descripcion,
                        "actualizado_por": admin_user_obj.id,
                    },
                )
                print(f"  {'[CREATE]' if created else '[EXISTS]'} {clave} = {valor}")

        await session.commit()

    # ──────────────────────────────────────────────────────────────
    # RESUMEN
    # ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("[SUCCESS] Seed completado exitosamente.")
    print("=" * 60)
    print("\nCredenciales de acceso:")
    print("  admin@foodstore.com    / admin123456    -> ADMIN")
    print("  stock@foodstore.com    / stock123456    -> STOCK")
    print("  pedidos@foodstore.com  / pedidos123456  -> PEDIDOS")
    print("  cliente@foodstore.com  / cliente123456  -> CLIENT")
    print("  cliente2@foodstore.com / cliente123456  -> CLIENT")
    print()

    await engine.dispose()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.run(seed_database(), loop_factory=asyncio.SelectorEventLoop)
    else:
        asyncio.run(seed_database())
