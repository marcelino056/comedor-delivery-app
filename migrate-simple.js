const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('🔗 Probando conexión a MongoDB...');
    
    await mongoose.connect('mongodb://127.0.0.1:27017/comedor_delivery', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    console.log('✅ Conectado a MongoDB exitosamente');
    
    // Crear una colección de prueba
    const Test = mongoose.model('Test', new mongoose.Schema({ name: String }));
    
    await Test.deleteMany({});
    console.log('✅ Operación de limpieza exitosa');
    
    const testDoc = new Test({ name: 'test' });
    await testDoc.save();
    console.log('✅ Documento de prueba creado');
    
    const count = await Test.countDocuments();
    console.log(`✅ Documentos en colección test: ${count}`);
    
    await Test.deleteMany({});
    console.log('✅ Limpieza final exitosa');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Conexión cerrada');
  }
}

testConnection();
