/* YMS Admin state bridge — exposes live classic-script lexical state to extension modules */
(function(){
  'use strict';
  function bridge(name,getter,setter){
    try{
      const d=Object.getOwnPropertyDescriptor(window,name);
      if(d&&d.configurable===false)return;
      Object.defineProperty(window,name,{configurable:true,enumerable:false,get:getter,set:setter});
    }catch(e){console.warn('[YMS] state bridge',name,e);}
  }
  try{bridge('_allStudents',()=>_allStudents,v=>{_allStudents=v;});}catch{}
  try{bridge('_allClasses',()=>_allClasses,v=>{_allClasses=v;});}catch{}
  try{bridge('_allUsers',()=>_allUsers,v=>{_allUsers=v;});}catch{}
  try{bridge('_classList',()=>_classList,v=>{_classList=v;});}catch{}
})();
