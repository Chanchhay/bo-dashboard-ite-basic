
export const POS_ROUTES = {
   
    terminal: "/pos",
  
    openRegister: "/pos/register",
 
    closeRegister: "/pos/close",
  
    lock: "/pos/lock",
} as const;


/*
 * Where leaving the till lands.
 *
 * The section's own entry page, not `/sales`: the sidebar resolves its tabs by
 * matching the path against the navigation tree, and no entry there points at
 * `/sales` — so landing on it renders the shell with an empty nav and no way
 * back except All apps. This is the same path the app launcher opens.
 */
export const SALES_HOME = "/sales/orders";
