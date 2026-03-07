function move() {
  console.log('hola')
  const left_curtain = document.getElementById("left-curtain");
  const right_curtain = document.getElementById("right-curtain");
  
  left_curtain.classList.add('left-curtain-open'); 
  right_curtain.classList.add('right-curtain-open');
}

$(window).on('load', function() {
  setTimeout(function() {
    $(".loader").css({display: "none"});
    $(".wrapp").css({display: "flex"});
  }, 2000);
})

window.addEventListener("scroll", move);