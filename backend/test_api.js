async function run() {
  const req = { name: "Usuario Prueba", email: "prueba@test.com", phone: "555-0000", model: "modular", message: "Hola, me interesa este modelo." };
  
  console.log("Enviando primera solicitud...");
  const res1 = await fetch('http://localhost:3001/api/clients', { 
    method: 'POST', 
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(req) 
  });
  console.log('Respuesta 1:', res1.status, await res1.json());
  
  console.log("Enviando segunda solicitud identica (deberia fallar por spam)...");
  const res2 = await fetch('http://localhost:3001/api/clients', { 
    method: 'POST', 
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(req) 
  });
  console.log('Respuesta 2:', res2.status, await res2.json());
}
run();
