import sys
import os

# Add the Prisma client directory to the Python path
prisma_client_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../node_modules/.pnpm/@prisma+client@7.5.0_prisma@7.5.0_@types+react@19.2.14_react-dom@18.2.0_react@18.2.0__react@1_euivzvz45culkvt4ktcwjlcuiq/node_modules/@prisma/client'))
if prisma_client_path not in sys.path:
    sys.path.insert(0, prisma_client_path)

from prisma import Prisma

# Initialize the Prisma client
prisma = Prisma()

async def get_db():
    """Provides a Prisma client instance for database operations."""
    if not prisma.is_connected():
        await prisma.connect()
    return prisma

# Ensure the Prisma client disconnects when the application stops
import atexit
atexit.register(lambda: prisma.disconnect())