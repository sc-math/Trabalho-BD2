from app.auth import hash_password

usuarios = [
    "admin@lojavirtual.com",
    "suporte@lojavirtual.com",
    "bruno@cliente.com",
    "julia@cliente.com",
    "marcos@cliente.com",
]

for email in usuarios:
    print(f"{email}:")
    print(hash_password("senha123"))
    print()