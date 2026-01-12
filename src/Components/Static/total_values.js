const res = fetch('http://127.0.0.1:5000/data/get_data',{
    method: "GET",
    headers: {
        "Content-Type": "application/json",
    }
})
if(res.ok){
    const data = await res.json();
    console.log(data);
}

export const total_values = {
  total_routes: 0,
  route_completed: 0,
};