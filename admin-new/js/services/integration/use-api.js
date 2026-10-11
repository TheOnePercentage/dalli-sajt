/**
 * Hook to use API in section components
 * Usage:
 * class MySection extends Component {
 *   constructor() {
 *     super();
 *     this.api = useAPI();
 *   }
 * }
 */
export function useAPI() {
  return window.apiService || window.imperium?.apiService;
}