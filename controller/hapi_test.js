var Hapi=require('hapi');
//var server=new Hapi.Server(3003);
server = Hapi.createServer('localhost', 3000) 
server.route({
    method:'GET',
    path:'/{name}',
    handler:function(request,reply){
        reply('Hello',+encodeURIComponent(request.params.name)+"!");
    }
});
server.start(function(){
    console.log("server is running at:",server.info.uri);
})