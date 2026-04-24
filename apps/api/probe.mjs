const url = process.argv[2]
import(url).then(()=>console.log('OK', url)).catch(e=>{
  console.error('FAIL', url, e.message)
  if (e.stack) console.error(e.stack.split('\n').slice(0,8).join('\n'))
})
