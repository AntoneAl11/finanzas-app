from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# La contraseña que el usuario configuró
password = "Al3m4nJ="

# El hash guardado en la base de datos
stored_hash = "$2b$12$7VaGuZHCp6JnCKeSSMY7PuYDkGy5Laq28WVTN8R1p5xRQYyP1YuhO"

# Verificar
result = pwd_context.verify(password, stored_hash)
print(f"¿La contraseña '{password}' coincide con el hash? {result}")

# También probar generar un nuevo hash para ver si bcrypt funciona
try:
    new_hash = pwd_context.hash("test123")
    print(f"\nBcrypt funciona correctamente.")
    print(f"Hash de prueba generado: {new_hash[:30]}...")
except Exception as e:
    print(f"\nError con bcrypt: {e}")
