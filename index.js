addEventListener('fetch', event => {
  const addr = new URL(event.request.url);
  //const host = addr.host;
  const path = addr.pathname;

  console.log(`add : ${addr}  path : ${path}`)

    if (path.includes(`favicon.ico`))
    {
      event.respondWith(new Response("",{ status: 404 }));
    }
    else if (path.startsWith('/status/') && event.request.method === "GET") {
      event.respondWith(getstatus(event.request))
    }
    else
    {
      event.respondWith(handleRequest(event.request));
    }
  })


async function handleRequest(request) {

// headers dont display cos they are not a JSON array so have to do this fudge to create a new attribute that is a JSON array.
// https://developers.cloudflare.com/workers/examples/logging-headers
// remove and reassign the request object to make it easier to display.
const headers = [...request.headers];
delete request["headers"]
request.headers = headers

// process the URL get the path 
const addr = new URL(request.url);
//const host = addr.host;
const path = addr.pathname;
let user = "";
if (path !== null && path !== "")
{
  user = path.split('/')[1]
}

// If a body has been passed we want to fetch it as text and then add it to the response body. 
// if (request.bodyUsed)
{
  request.bodyText = { "value" : await request.text() }
}

// remove the cloudflare part of the request as we dont need this info
delete request["cf"]

await KV.put(user + "~" + Date.now().toString(), JSON.stringify(request), {expirationTtl : 3600} );

return new Response(JSON.stringify(request), {
    headers: { 'content-type': 'application/json' },
    status: 200,
})

}

async function getKVs(url, maxRecords) {

  console.log("in getKVs");
  if (url === null || url === "")
  {
    return [];
  }
  console.log("pre kv list")
  //const res = await KV.list({prefix: url, limit: maxRecords});
  const res = await KV.list({prefix: url + "~"});
  //return res.keys.filter((x) => (x.name.startsWith(url + "~"))).slice(0,maxRecords)
  //let res = [] //await KV.list();
  console.log("pre-post kv list")
  
  if (true || res.length === 0)
  {
    console.log("kv length is 0")
  }

  // the following extracts the keys from the json returned by the KV.list() and then reverses the array
  // so the most recent records are at the start then takes the first maxRecords using the slice() method

  //return res.keys.slice().reverse().filter((x) => (x.name.startsWith(url + "~"))).slice(0,maxRecords);
  return res.keys.slice().reverse().slice(0,maxRecords);

}


async function getstatus(request) {

  console.log("in getStatus()")
  //return new Response("hello world", { status: 200 })
  const url = new URL(request.url)

  let maxRecords = 100;
    // Make sure we have the minimum necessary query parameters.
  if (!url.searchParams.has("url")) {
    console.log("returning 403")
    return new Response("Missing query parameter url", { status: 403 })
  }
  
  if (url.searchParams.has("max-records")) {
    maxRecords = parseInt(url.searchParams.get('max-records'))
  }
  console.log(`max-records : ${url.searchParams.get('max-records')}`)

  console.log(`searchurl is : ${url.searchParams.get("url")}`)
  let searchUrl = url.searchParams.get('url')

  const kvs = await getKVs(searchUrl,maxRecords);

  console.log(`post get kvs length : ${kvs.length} `)
  if (kvs === null || kvs.length === 0)
  {
    console.log("returning")
    console.log(`searchUrl : ${searchUrl}`)
    return new Response(`No Data for url : ${searchUrl}`, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    })  
  }
  
  let html = `<head>
  <style> .styled-table {
    border-collapse: collapse;
    margin: 25px 0;
    font-size: 0.9em;
    font-family: sans-serif;
    min-width: 400px;
    width: 1000px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
    table-layout: auto;
}
.styled-table thead tr {
  background-color: #009879;
  color: #ffffff;
  text-align: left;
}
.styled-table th,
.styled-table td {
    padding: 12px 15px;
    text-overflow: ellipsis;
    overflow: hidden;
    width: auto !important;
}
.styled-table tbody tr {
  border-bottom: 1px solid #dddddd;
}

.styled-table tbody tr:nth-of-type(even) {
  background-color: #f3f3f3;
}

.styled-table tbody tr:last-of-type {
  border-bottom: 2px solid #009879;
}
.styled-table tbody tr.active-row {
  font-weight: bold;
  color: #009879;
}

</style></head><body><table class="styled-table"><tr><th>URL</th><th>Request Date</th><th>Request Details</th></tr>`;

  for (item of kvs) {
    const monitor = JSON.parse(await KV.get(item.name))
    const epochTime = parseInt((item.name).split("~")[1])
    console.log(`epochTime ${epochTime}`)
    const urlToDisplay = (item.name).split("~")[0]
    const formattedDate = getDateTimeFromTimestamp(epochTime);
    html += `<tr><td>${urlToDisplay}</td><td>${formattedDate}</td>
    <td>${JSON.stringify(monitor)}</td></tr>`
  }

  html += `</table>
  <p><a href="/ui/v1/">Home Page</a></p>
  <body>`

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });

}

function getDateTimeFromTimestamp(unixTimeStamp) {
  let date = new Date(unixTimeStamp);
  return ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + date.getFullYear() + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
}
