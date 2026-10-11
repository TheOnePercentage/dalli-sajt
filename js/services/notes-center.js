export class Service {
  constructor(){ this.enabled=true; }
  loadConfig(){ return {enabled:true,version:1}; }
  getStatus(){ return {status:'ok'}; }
}
export default Service;
