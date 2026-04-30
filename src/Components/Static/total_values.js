import API_BASE_URL from '../../utils/config';

export const total_values = {
    total_routes: 0,
    route_completed: 0,
};

(async function loadTotals(){
    try{
        const res = await fetch(`${API_BASE_URL}/data/get_data`,{
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        if(res.ok){
            const data = await res.json();
            console.log("total_values loaded", data);
        }
    }catch(e){
        console.warn("Could not load total_values:", e);
    }
})();