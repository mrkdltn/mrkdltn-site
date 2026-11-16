/* Charts build once as they come into view. Nothing loops or replays. */
(function(){var r=document.documentElement,c=document.querySelectorAll('.chart');if(!c.length||!('IntersectionObserver' in window))return;r.classList.add('js');
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -12% 0px',threshold:0.2});
c.forEach(function(el){io.observe(el);});window.addEventListener('beforeprint',function(){c.forEach(function(el){el.classList.add('in');});});})();
