addEventListener('fetch', event => {
  const addr = new URL(event.request.url);
  //const host = addr.host;
  const path = addr.pathname;

  console.log(`add : ${addr}  path : ${path}`)

    if (path.startsWith('/status/') && event.request.method === "GET") {
      //event.respondWith(getstatus(event.request));
      event.respondWith(new Response())
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

await KV.put(user + "~" + Date.now().toString(), JSON.stringify(request), {expirationTtl : 600} );

return new Response(JSON.stringify(request), {
    headers: { 'content-type': 'application/json' },
    status: 200,
})

}

async function getKVs(url) {

  console.log("in getKVs");
  if (url === null || url === "")
  {
    return [];
  }
  console.log("pre kv list")
  //const res = await KV.list();
  let res = [] //await KV.list();
  console.log("pre-post kv list")
  if (true || res.length === 0)
  {
    console.log("kv length is 0")
    return [];
  }
  return res.keys.filter((x) => (x.name.startsWith(url + "~")));

}


async function getstatus(request) {

  console.log("in getStatus()")
  return new Response("hello world", { status: 200 })
  const url = new URL(request.url)
    // Make sure we have the minimum necessary query parameters.
  if (!url.searchParams.has("url")) {
    console.log("returning 403")
    return new Response("Missing query parameter url", { status: 403 })
  }

  console.log(`searchurl is : ${url.searchParams.get("url")}`)
  let searchUrl = url.searchParams.get('url')

  const kvs = await getKVs(searchUrl);

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
  
  let html = `<head><style> .styled-table {
    border-collapse: collapse;
    margin: 25px 0;
    font-size: 0.9em;
    font-family: sans-serif;
    min-width: 400px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
}
.styled-table thead tr {
  background-color: #009879;
  color: #ffffff;
  text-align: left;
}
.styled-table th,
.styled-table td {
    padding: 12px 15px;
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

</style></head><body><table class="styled-table"><tr><th>URL</th><th>Last Success</th><th>Last Fail</th><th>Frequency (secs)</th></tr>`;

  for (item of kvs) {
    const monitor = JSON.parse(await KV.get(item.name));
    html += `<tr><td>${item.name}</td><td>${item.last_success == null || item.last_success === "" ? "" : getDateTimeFromTimestamp(parseInt(item.last_success))}</td>
    <td>${item.last_failed == null || item.last_failed === "" ? "" : getDateTimeFromTimestamp(parseInt(item.last_failed))}</td><td>${monitor == null ? "?" : monitor.frequency}</td></tr>`
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
