# 🛠 Tools Registry

**Source File**: [`src/services/tools.ts`](../src/services/tools.ts)

This document provides a comprehensive reference for all executable tools available in the Agent Builder. Tools are organized by their primary functional domain.

## 📚 Table of Contents
- [Search & Grounding](#search--grounding)
- [Transport](#transport)
- [Customer Service](#customer-service)
- [Utilities](#utilities)

---

## Search & Grounding

### Google Search
**ID:** `google_search`  
**Tags:** `Grounding`, `Search`  
**Description:** Uses Google Search to ground the response in real-world data and current events.  
**Native Integration:** This tool is handled natively by the Gemini API.

### Simulated Web Search
**ID:** `web_search_mock`  
**Tags:** `Data Retrieval`, `Search`  
**Description:** Simulates a search engine for demo purposes. Returns mock results.  
**Parameters:**
- `query` (string, required): The search query.

### Knowledge Base Search
**ID:** `kb_search`  
**Tags:** `Customer Service`, `Search`, `Knowledge Base`  
**Description:** Search company policies, FAQs, and documentation.  
**Parameters:**
- `keywords` (string, required): Search terms.

---

## Transport

### NSW Trains Realtime
**ID:** `nsw_trains_realtime`  
**Tags:** `Data Retrieval`, `Transport`  
**Description:** Get real-time trip updates for the Sydney Trains network.  
**Parameters:** None.  
**Note:** Fetches data from the Transport for NSW GTFS-Realtime feed.

### NSW Metro Realtime
**ID:** `nsw_metro_realtime`  
**Tags:** `Data Retrieval`, `Transport`  
**Description:** Get real-time trip updates for the Sydney Metro network.  
**Parameters:** None.  
**Note:** Fetches data from the Transport for NSW GTFS-Realtime feed.

### NSW Trip Planner
**ID:** `nsw_trip_planner`  
**Tags:** `Data Retrieval`, `Transport`, `Planning`  
**Description:** Plan a trip using NSW public transport (Trains, Metro, Buses, Ferries, etc.).  
**Parameters:**
- `origin` (string, required): Starting location (e.g., "Central Station", "Bondi Beach").
- `destination` (string, required): Destination location (e.g., "Manly Wharf", "Parramatta").
- `mode` (string, optional): Preferred mode of transport. Options: `train`, `metro`, `bus`, `ferry`, `lightrail`, `coach`, `any`. Defaults to `any`.

---

## Customer Service

### CRM Customer Lookup
**ID:** `crm_customer_lookup`  
**Tags:** `Customer Service`, `Data Retrieval`  
**Description:** Retrieve customer details, VIP status, and recent interactions by email.  
**Parameters:**
- `email` (string, required): Customer email address.
**Mock Data:** Use `vip` in the email to trigger a VIP response.

### Check Order Status
**ID:** `check_order_status`  
**Tags:** `Customer Service`, `Data Retrieval`  
**Description:** Get the shipping status and delivery date of an order.  
**Parameters:**
- `order_id` (string, required): The Order ID (e.g. ORD-123).

### Create Support Ticket
**ID:** `create_support_ticket`  
**Tags:** `Customer Service`, `Action`  
**Description:** Escalate an issue by creating a ticket in the tracking system.  
**Parameters:**
- `user_email` (string, required): User email.
- `subject` (string, required): Ticket subject.
- `priority` (string, required): High, Medium, or Low.

---

## Utilities

### Calculator
**ID:** `calculator`  
**Tags:** `Utility`, `Math`  
**Description:** Perform mathematical calculations.  
**Parameters:**
- `expression` (string, required): The mathematical expression to evaluate (e.g., "2 + 2 * 5").

### System Time
**ID:** `get_current_time`  
**Tags:** `Utility`, `Time`  
**Description:** Get the current date and time in ISO format.  
**Parameters:** None.

### Publish Report
**ID:** `publish_report`  
**Tags:** `Utility`, `Report`  
**Description:** Publishes a formatted report to the user interface.  
**Parameters:**
- `title` (string, required): The title of the report.
- `content` (string, required): The main content of the report in Markdown format.
- `summary` (string, required): A brief summary or executive abstract.
**UI Behavior:**
The output of this tool is intercepted by the UI and rendered as a distinct "Report Card" with rich-text formatting (tables, lists, code blocks).
