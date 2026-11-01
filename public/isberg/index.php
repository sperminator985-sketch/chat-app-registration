<?php
setcookie('index', 'TimeToLive', time() + 86400, '/');
?>

<html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<link rel="icon" href="favicon4.png" type="image/png">
<title>Айсберг-Видео</title>
<link rel="stylesheet" href="style.css?v=123" />
<link rel="stylesheet" href="preload.css?v=99" />
<style>
html, body { margin: 0; overflow-x: hidden; }
.block.fit { position: absolute; left: 0; top: 0; margin: 0; width: 1611px; height: 960px; transform-origin: 0 0; }
.block.fit #Layer1 img { display: block; }
</style>
<script src="jquery-3.7.0.min.js"></script>

<script>
var userAgent = navigator.userAgent;
if (userAgent.match(/Android/i)) {
location.href="https://isbergvideo.ru"
}
</script>

<?php
if(!isset($_COOKIE['index'])) {
echo '
<div class="preloader">
<div class="spinner">
<img src="favicon4.png" alt="Загрузка">
</div>
<div id="Layer154"><span class="стиль154">Идет загрузка страницы...</span></div>
</div>
';
}
?>  

<script>
$(window).on('load', function() {
  $('.preloader').delay(1000).fadeOut('slow');
});
</script>

<audio id="player" type="audio/mp3">
<script>
vid = document.getElementById("player");
vid.volume = 1.0;
var tracks = ['Virus-Leto.mp3','REFLEX - Leto.mp3','Igorek-Leto.mp3','Demo-Leto.mp3','Chi-Li-Leto.mp3'];
var player = document.getElementById('player');
var current = 0;
player.src = tracks[0];
player.onended = function() {
  current++;
  if (current >= tracks.length) current = 0;
  player.src = tracks[current];
  player.play();
}
$( document ).ready(function() {
    $('.on').click(function() {
        $('.off').css('display', 'block');
        $(this).css('display', 'none');
    });
});
$( document ).ready(function() {
    $('.off').click(function() {
        $(this).css('display', 'none');
        $('.on').css('display', 'block');
    });
});
</script>
</audio>

<script>
function MM_swapImgRestore() { //v3.0
  var i,x,a=document.MM_sr; for(i=0;a&&i<a.length&&(x=a[i])&&x.oSrc;i++) x.src=x.oSrc;
}
function MM_findObj(n, d) { //v4.01
  var p,i,x;  if(!d) d=document; if((p=n.indexOf("?"))>0&&parent.frames.length) {
    d=parent.frames[n.substring(p+1)].document; n=n.substring(0,p);}
  if(!(x=d[n])&&d.all) x=d.all[n]; for (i=0;!x&&i<d.forms.length;i++) x=d.forms[i][n];
  for(i=0;!x&&d.layers&&i<d.layers.length;i++) x=MM_findObj(n,d.layers[i].document);
  if(!x && d.getElementById) x=d.getElementById(n); return x;
}
function MM_swapImage() { //v3.0
  var i,j=0,x,a=MM_swapImage.arguments; document.MM_sr=new Array; for(i=0;i<(a.length-2);i+=3)
   if ((x=MM_findObj(a[i]))!=null){document.MM_sr[j++]=x; if(!x.oSrc) x.oSrc=x.src; x.src=a[i+2];}
}
</script>

<div class="block">

<button class="off image-button2" onclick="document.getElementById('player').play()"></button>
<button class="on image-button" onclick="document.getElementById('player').pause()"></button>
    
<div id="Layer1"><img src="q654321.jpg"></div>
<div id="Layer2"><img src="40d.gif" width="570" height="81" border="0"></div>
<div id="Layer3"><span class="стиль1">Адрес: Фрунзе-20, оф.427</span></div>
<div id="Layer4"><span class="стиль1">E-mail: daumsam@mail.ru</span></div>
<div id="Layer5"><span class="стиль1">Тел: 8-909-547-23-25</span></div>
<div id="Layer6"><img src="copy1.gif" width="140" height="50" border="0"></div>
<div id="Layer8"><a href="Is44.php"><img src="Port2.gif" width="140" height="50" border="0" title="Портфолио" id="Image4" onMouseOver="MM_swapImage('Image4','','Port1.gif',1)" onMouseOut="MM_swapImgRestore()"></a></div> 
<div id="Layer9"><a href="Is3.php"><img src="copy4.gif" width="140" height="50" border="0" title="Реклама на сайте" id="Image5" onMouseOver="MM_swapImage('Image5','','copy41.gif',1)" onMouseOut="MM_swapImgRestore()"></a></div> 
<div id="Layer10"><a href="Is5.php"><img src="copy3.gif" width="140" height="50" border="0" title="Цены" id="Image6" onMouseOver="MM_swapImage('Image6','','copy31.gif',1)" onMouseOut="MM_swapImgRestore()"></a></div>
<div id="Layer11"><a href="Is2.php"><img src="copy5.gif" width="140" height="50" border="0" title="Информация о компании" id="Image2" onMouseOver="MM_swapImage('Image2','','copy51.gif',1)" onMouseOut="MM_swapImgRestore()"></a></div>
<div id="Layer12"><a href="Is21.php"><img src="copy77.gif" width="140" height="50" border="0" title="Интернет-магазин" id="Image1" onMouseOver="MM_swapImage('Image1','','copy717.gif',1)" onMouseOut="MM_swapImgRestore()"></a></div>
<div id="Layer13"><a href="feedback.php"><img src="zakaz1.gif" width="140" height="50" border="0" title="Обратная связь" id="Image3" onMouseOver="MM_swapImage('Image3','','zakaz2.gif',1)" onMouseOut="MM_swapImgRestore()"></a></div>
<div id="Layer14"><a href="Is18.html" target="_self"><img src="308.gif" width="568" height="82" title="VirtualGirls"></a></div>
<div id="Layer15"><a href="Is18.html" target="_self"><img src="18plus.png" width="50" height="50" title="VirtualGirls"></a></div>
<div id="Layer7"><a href="https://tv.yandex.ru/67" target="_blank"><img src="prog4.jpg" width="140" height="50" border="0" title="Программа ТВ"></a></div>
<div id="Layer16"><a href="https://pogoda.vtomske.ru/tomsk/webcams" target="_blank"><img src="15d.gif" width="140" height="50" border="0" title="Веб-камеры Томска"></a></div>
<div id="Layer17"><a href="https://www.chipdip.ru/catalog" target="_blank"><img src="12d.gif" width="140" height="50" border="0" title="Электронные компоненты"></a></div>
<div id="Layer18"><a href="https://1001goroskop.ru" target="_blank"><img src="9d.gif" width="140" height="50" border="0" title="Гороскопы"></a></div>
<div id="Layer19"><a href="https://www.darkside.ru" target="_blank"><img src="11d.gif" width="140" height="50" border="0" title="Сайт о рок-музыке"></a></div>
<div id="Layer22"><a href="https://www.bibliofond.ru/typework.aspx?id=3" target="_blank"><img src="13d.gif" width="140" height="50" border="0" title="Рефераты"></a></div>
<div id="Layer20"><a href="https://wallpaperscraft.ru" target="_blank"><img src="wall.gif" width="140" height="50" border="0" title="Обои для рабочего стола"></a></div>
<div id="Layer21" class="image"><a href="https://yandex.ru/weather/tomsk" target="_blank"><img src="http://pogodavtomske.ru/informer.php" width="85" height="85" border="0" title="Погода в Томске"></a></div>

<div id="Layer7145">
<link href="https://api.rusmeteo.net/service/informers/css/widget-ticker.min.css" rel="stylesheet" type="text/css">
<a href="https://rusmeteo.net/weather/tomsk/" class="rus-widget-ticker disabled" id="8fd5eba34939bf32ef01621d95c80ba1" style="width:350px;background-color:rgba(0, 0, 0, 0);color:rgb(54, 57, 69)"></a>
<script async src="https://rusmeteo.net/api/informerV2/8fd5eba34939bf32ef01621d95c80ba1/" type="text/javascript"></script>
</div>

<div id="Layer23">
<script> 
document.write('<img src="//counter.yadro.ru/hit?t15.1;r'+escape(document.referrer)+((typeof(screen)=='undefined')?'':';s'+screen.width+'*'+screen.height+'*'+(screen.colorDepth? screen.colorDepth:screen.pixelDepth))+';u'+escape(document.URL)+';h'+escape(document.title.substring(0,150))+';'+Math.random()+'"'+'border="0" width="114" height="49"><\/a>')
</script>
</div>

</div>

<script>
(function () {
  var W = 1341, H = 960, X = 270;
  function fit() {
    var b = document.querySelector('.block');
    if (!b) return;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    if (vw < 1025) { b.classList.remove('fit'); b.style.transform = ''; document.body.style.height = ''; return; }
    b.classList.add('fit');
    var s = vw > vh ? Math.min(vw / W, vh / H) : vw / W;
    var left = (vw - W * s) / 2 - X * s;
    b.style.transform = 'translate(' + left + 'px, 0) scale(' + s + ')';
    document.body.style.height = Math.ceil(H * s) + 'px';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  document.addEventListener('DOMContentLoaded', fit);
  fit();
})();
</script>

</html>