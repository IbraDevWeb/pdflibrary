const base='https://api.usul.ai/search/books';
for (const [label,query] of [['latin','malik'],['arabic','مالك']]){
 const url=new URL(base);url.searchParams.set('q',query);url.searchParams.set('limit','5');url.searchParams.set('locale','en');
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(16000),headers:{Accept:'application/json'}});
  const body=await response.text();
  let json=null;try{json=JSON.parse(body)}catch{}
  const results=Array.isArray(json)?json:Array.isArray(json?.results)?json.results:Array.isArray(json?.books)?json.books:Array.isArray(json?.data)?json.data:null;
  console.log(JSON.stringify({label,status:response.status,type:response.headers.get('content-type'),cors:response.headers.get('access-control-allow-origin'),bodyKeys:json&&typeof json==='object'?Object.keys(json).slice(0,14):null,results:results?.length,resultsType:json?.results&&typeof json.results,resultsKeys:json?.results&&!Array.isArray(json.results)?Object.keys(json.results).slice(0,30):null,resultsPreview:JSON.stringify(json?.results).slice(0,2500),pagination:json?.pagination,first:results?.[0]?JSON.stringify(results[0]).slice(0,1700):null,snippet:!json?body.slice(0,360):null}));
 }catch(e){console.log(JSON.stringify({label,error:String(e)}))}
}
