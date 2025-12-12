# 🛠 Tools Registry

This document provides a comprehensive reference for all executable tools available in the Agent Builder. These tools can be assigned to agents to extend their capabilities beyond simple text generation.

## 📚 Table of Contents
- [Grounding](#grounding)
  - [Google Search](#google-search)
- [Utility](#utility)
  - [Calculator](#calculator)
  - [System Time](#system-time)
  - [Publish Report](#publish-report)
- [Data Retrieval](#data-retrieval)
  - [Simulated Web Search](#simulated-web-search)
  - [NSW Trains Realtime](#nsw-trains-realtime)
  - [NSW Metro Realtime](#nsw-metro-realtime)
  - [NSW Trip Planner](#nsw-trip-planner)
- [Customer Service](#customer-service)
  - [CRM Customer Lookup](#crm-customer-lookup)
  - [Check Order Status](#check-order-status)
  - [Knowledge Base Search](#knowledge-base-search)
  - [Create Support Ticket](#create-support-ticket)

---

## Grounding

### Google Search
**ID:** `google_search`  
**Description:** Uses Google Search to ground the response in real-world data and current events.  
**Native Integration:** This tool is handled natively by the Gemini API.

---

## Utility

### Calculator
**ID:** `calculator`  
**Description:** Perform mathematical calculations.  
**Parameters:**
- `expression` (string, required): The mathematical expression to evaluate (e.g., "2 + 2 * 5").

### System Time
**ID:** `get_current_time`  
**Description:** Get the current date and time in ISO format.  
**Parameters:** None.

### Publish Report
**ID:** `publish_report`  
**Description:** Publishes a formatted report to the user interface.  
**Parameters:**
- `title` (string, required): The title of the report.
- `content` (string, required): The main content of the report in Markdown format.
- `summary` (string, required): A brief summary or executive abstract.
**UI Behavior:**
The output of this tool is intercepted by the UI and rendered as a distinct "Report Card" with rich-text formatting (tables, lists, code blocks).

---

## Data Retrieval

### Simulated Web Search
**ID:** `web_search_mock`  
**Description:** Simulates a search engine for demo purposes. Returns mock results.  
**Parameters:**
- `query` (string, required): The search query.

### NSW Trains Realtime
**ID:** `nsw_trains_realtime`  
**Description:** Get real-time trip updates for the Sydney Trains network.  
**Parameters:** None.  
**Note:** Fetches data from the Transport for NSW GTFS-Realtime feed.

### NSW Metro Realtime
**ID:** `nsw_metro_realtime`  
**Description:** Get real-time trip updates for the Sydney Metro network.  
**Parameters:** None.  
**Note:** Fetches data from the Transport for NSW GTFS-Realtime feed.

### NSW Trip Planner
**ID:** `nsw_trip_planner`  
**Description:** Plan a trip using NSW public transport (Trains, Metro, Buses, Ferries, etc.).  
**Parameters:**
- `origin` (string, required): Starting location (e.g., "Central Station", "Bondi Beach").
- `destination` (string, required): Destination location (e.g., "Manly Wharf", "Parramatta").
- `mode` (string, optional): Preferred mode of transport. Options: `train`, `metro`, `bus`, `ferry`, `lightrail`, `coach`, `any`. Defaults to `any`.

---

## Customer Service

### CRM Customer Lookup
**ID:** `crm_customer_lookup`  
**Description:** Retrieve customer details, VIP status, and recent interactions by email.  
**Parameters:**
- `email` (string, required): Customer email address.
**Mock Data:** Use `vip` in the email to trigger a VIP response.

### Check Order Status
**ID:** `check_order_status`  
**Description:** Get the shipping status and delivery date of an order.  
**Parameters:**
- `order_id` (string, required): The Order ID (e.g. ORD-123).

### Knowledge Base Search
**ID:** `kb_search`  
**Description:** Search company policies, FAQs, and documentation.  
**Parameters:**
- `keywords` (string, required): Search terms.

### Create Support Ticket
**ID:** `create_support_ticket`  
**Description:** Escalate an issue by creating a ticket in the tracking system.  
**Parameters:**
- `user_email` (string, required): User email.
- `subject` (string, required): Ticket subject.
- `priority` (string, required): High, Medium, or Low.
