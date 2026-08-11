# **CitiGoo Phase 2B 开发方案与分工**

## **S2BDIY 供应商 / 物流履约对接版**

## **一、Phase 2B 当前定位**

Phase 2A 已完成，已有能力包括：

* AI 生成设计图；  
* AI 生成 JPG / PNG 印刷文件；  
* 创建商品草稿；  
* 卖家发布商品；  
* 买家浏览、加购、Stripe 支付；  
* 订单生成。

Phase 2B 不重做 Phase 2A。  
 Phase 2B 的目标是：

把 Phase 2A 已生成的 AI 商品，接入 S2BDIY 的真实产品生成、下单、支付、物流和订单状态查询流程。

新 v4 方案本来就要求 Phase 2A 做 AI 商品生成和印刷文件，Phase 2B 再做供应商 / 物流履约，并且供应商要抽象为 `suppliers`，不要把 S2BDIY 写死成唯一供应商。

---

## **二、Phase 2B 最终主流程**

根据现有 S2BDIY 接口，Phase 2B 主流程应定为：

AI 生成 print\_file  
→ 上传素材到 S2BDIY  
→ 获取 material\_id  
→ 选择 basic\_product\_id / size\_id / color\_id / view\_id  
→ quickCreate 创建供应商产品  
→ 获取 supplier\_product\_id  
→ 查询 product detail 获取供应商效果图  
→ 保存 supplier\_product\_id 和 supplier\_mockup\_image\_url  
→ 卖家确认 / 商品发布  
→ 买家 Stripe 支付  
→ CitiGoo 创建 S2BDIY 订单  
→ CitiGoo 调用 orderPay 支付供应商订单  
→ CitiGoo 轮询 order detail  
→ 同步生产状态、支付状态、物流号、tracking  
→ 买家订单查询页 / 卖家后台展示履约状态

其中，上传素材接口要求 `image` 为二进制文件流，支持 jpg、png、jpeg，最大 20M，返回 `id/name/image_url`；quickCreate 用 `material_id + basic_product_id + view_id + design_type` 创建供应商产品，并返回 `product_id/product_name/product_code`。

---

## **三、关键接口确认**

## **1\. 上传素材**

接口：

POST /open/v1/material/uploadMaterial

用途：

把 Phase 2A 生成的 AI print\_file 上传给 S2BDIY。

请求重点：

image: file，必填，jpg / png / jpeg，最大 20M  
name: string，选填，素材名称

返回重点：

id          素材编号  
name        素材名称  
image\_url   素材图片链接

CitiGoo 保存为：

supplier\_material\_id  
supplier\_material\_name  
supplier\_material\_url  
---

## **2\. 创建供应商产品 quickCreate**

接口：

POST /open/v1/product/quickCreate

用途：

把上传的 AI 素材贴到 S2BDIY 的基础选品模板上，生成可下单的供应商 product\_id。

请求核心字段：

{  
 "size\_id": 20,  
 "color\_id": 6,  
 "product\_design": {  
   "basic\_product\_id": 1672,  
   "name": "产品名称",  
   "views": \[  
     {  
       "view\_id": 1,  
       "objects": \[  
         {  
           "type": "image",  
           "material\_id": 52336,  
           "design\_type": 1  
         }  
       \]  
     }  
   \]  
 }  
}

`design_type` 已确认：

1 \= 适应  
2 \= 拉伸  
3 \= 填充

返回核心字段：

product\_id       供应商产品 ID  
product\_name     产品名称  
product\_code     产品编码

CitiGoo 保存为：

supplier\_product\_id  
supplier\_product\_name  
supplier\_product\_code  
---

## **3\. 获取供应商产品详情和效果图**

接口：

GET /open/v1/product/{id}

用途：

获取 quickCreate 后的产品详情，以及供应商生成的商品展示图。

返回中关键字段：

show\_images\[\].images\[\].src  
variants\[\].show\_images

CitiGoo 的商品主图 / mockup 图应来自这里。

推荐保存规则：

supplier\_mockup\_image\_url \= variants\[\].show\_images 优先  
如果没有，则取 show\_images\[\].images\[0\].src

也就是说，CitiGoo 不再使用本地模板合成 mockup。  
 卖家商品草稿页和买家商品详情页最终展示：

S2BDIY product detail 返回的供应商效果图

产品详情接口返回 `show_images` 和 `variants[].show_images`，可作为供应商生成的商品展示图。

---

## **4\. 基础选品详情**

接口：

GET /open/v1/basicProduct/{id}

用途：

获取基础选品的颜色、尺码、变体、打印面、印刷区域、展示图、采购价和包装规格。

已经确认可以拿到：

basic\_product\_id \= data.id  
colors\[\].id \= color\_id  
sizes\[\].id \= size\_id  
items\[\].id \= supplier\_variant\_id  
items\[\].price \= 采购价  
views\[\].id \= view\_id  
print\_areas\[\].width / height \= 设计区域宽高，单位 px  
product\_show\_images \= 基础选品展示图  
size\_specifications \= 包装重量和尺寸

这个接口已经明确 `colors[].id` 是颜色编号、`sizes[].id` 是尺码编号、`views[].id` 是打印面编号，`print_areas[].width/height` 是 px 单位。

---

## **5\. 运费试算**

接口：

GET /open/v1/logisticsCalculation

用途：

下单前根据选品、目的国、重量和尺寸试算物流费用，获取可用物流渠道。

请求核心字段：

basic\_product\_id  
platform  
num  
country  
province  
postcode  
weight  
length  
width  
height

返回核心字段：

logistics\_platform\_id  
name  
en\_name  
full\_en\_name  
day\_from  
day\_to  
amount  
min\_amount  
max\_amount

创建订单时使用：

logistics\_id \= logistics\_platform\_id  
---

## **6\. 获取订单可用物流**

接口：

GET /open/v1/logistics/orderLogistics

用途：

如果订单因为物流渠道不可支付，或者需要更换物流渠道，可以通过这个接口获取该订单可用物流，再调用修改物流接口。

请求：

order\_no

返回：

logistics\_platform\_id  
amount  
day\_from  
day\_to

第一版优先在下单前通过 `logisticsCalculation` 选择物流；订单创建后如有不可支付，再用 `orderLogistics` 修正。

---

## **7\. 支付供应商订单**

接口：

POST /open/v1/orderPay

用途：

创建 S2BDIY 订单后，调用此接口支付订单。

请求：

{  
 "ids": \[6966190\]  
}

这里 `ids` 是 S2BDIY 订单编号数组。

Phase 2B 状态不能只停在“已推送供应商”，必须区分：

supplier\_order\_created  
supplier\_payment\_pending  
supplier\_paid  
supplier\_pay\_failed

`orderPay` 明确要求传 `ids` 数组支付订单。

---

## **8\. 查询订单详情**

接口：

GET /open/v1/order/{id}

用途：

因为目前没有 webhook，所以 CitiGoo 需要通过订单详情轮询状态。

返回中关键字段：

status  
status\_text  
pay\_status  
pay\_status\_text  
product\_amount  
shipping\_amount  
total\_amount  
order\_items\[\].show\_image  
order\_logistics.logisticss\_track\_number  
order\_logistics.logisticss\_status  
order\_logistics.oss\_file\_src

订单状态枚举：

1 未确认  
2 未付款  
3 审核中  
4 排单中  
5 生产中  
6 已发货  
7 已取消

支付状态枚举：

1 待支付  
2 支付中  
3 支付完成  
4 支付失败

物流状态枚举包括等待寄送、运输途中、成功签收、投递失败、物流取消、待揽收、已丢件等。订单详情接口返回订单金额、运费、总额、支付状态、订单状态、物流单号和面单链接等字段。

---

# **四、Phase 2B 系统状态设计**

## **1\. 商品侧状态**

supplier\_product\_status:  
\- not\_created          未创建供应商产品  
\- material\_uploaded    素材已上传  
\- product\_created      供应商产品已创建  
\- product\_synced       产品详情和效果图已同步  
\- failed               创建失败

## **2\. 供应商订单状态**

supplier\_order\_status:  
\- not\_pushed  
\- created  
\- payment\_pending  
\- paid  
\- reviewing  
\- queued  
\- in\_production  
\- shipped  
\- cancelled  
\- failed

对应 S2BDIY `status`：

1 未确认      → reviewing / created  
2 未付款      → payment\_pending  
3 审核中      → reviewing  
4 排单中      → queued  
5 生产中      → in\_production  
6 已发货      → shipped  
7 已取消      → cancelled

## **3\. 支付状态**

对应 S2BDIY `pay_status`：

1 待支付      → payment\_pending  
2 支付中      → paying  
3 支付完成    → paid  
4 支付失败    → pay\_failed

## **4\. 物流状态**

对应 `order_logistics.logisticss_status`：

1 等待寄送  
2 运输途中  
3 到达待取  
4 成功签收  
5 运输过久  
6 投递失败  
7 可能异常  
8 物流取消  
9 已退件销毁  
10 已退件回收  
11 待揽收  
12 已丢件  
---

# **五、数据表 / 字段设计**

## **1\. suppliers**

id  
code  
name  
api\_base\_url  
test\_api\_base\_url  
status  
raw\_json  
created\_at  
updated\_at

示例：

code \= s2bdiy  
name \= S2BDIY  
---

## **2\. supplier\_products**

用于保存基础选品和 quickCreate 后的供应商产品。

id  
supplier\_id  
platform\_product\_id  
basic\_product\_id  
basic\_product\_code  
basic\_product\_name  
basic\_product\_en\_name  
purchase\_price  
supplier\_product\_id  
supplier\_product\_code  
supplier\_product\_name  
product\_show\_master\_image  
supplier\_mockup\_image\_url  
produce\_country  
warehouse\_name  
deliver\_goods\_text  
status  
raw\_json  
created\_at  
updated\_at

说明：

basic\_product\_id \= S2BDIY 未设计选品 ID  
supplier\_product\_id \= quickCreate 后返回的可下单 product\_id  
---

## **3\. supplier\_product\_variants**

id  
supplier\_id  
basic\_product\_id  
supplier\_product\_id  
supplier\_variant\_id  
supplier\_variant\_code  
supplier\_size\_id  
supplier\_color\_id  
size\_name  
color\_name  
sku  
price  
weight  
length  
width  
height  
status  
raw\_json  
created\_at  
updated\_at

来源：

basicProduct detail 的 items\[\]  
product detail 的 variants\[\]  
---

## **4\. supplier\_print\_specs**

id  
supplier\_id  
basic\_product\_id  
supplier\_product\_id  
view\_id  
view\_name  
view\_en\_name  
design\_area\_width  
design\_area\_height  
design\_area\_unit  
design\_type  
tip\_level  
raw\_json  
created\_at  
updated\_at

说明：

design\_area\_unit \= px  
design\_type \= 1 适应 / 2 拉伸 / 3 填充  
---

## **5\. product\_assets**

id  
store\_id  
product\_id  
ai\_job\_id  
supplier\_id  
supplier\_material\_id  
supplier\_material\_name  
supplier\_material\_url  
asset\_type  
url  
file\_format  
width  
height  
dpi  
view\_id  
design\_type  
metadata\_json  
created\_at  
updated\_at

`asset_type`：

design  
print\_file  
supplier\_material  
supplier\_mockup  
---

## **6\. supplier\_orders**

id  
store\_id  
order\_id  
supplier\_id  
supplier\_order\_id  
third\_order\_id  
platform  
supplier\_store\_id  
logistics\_id  
logistics\_name  
product\_amount  
shipping\_amount  
total\_amount  
supplier\_status  
supplier\_status\_text  
supplier\_pay\_status  
supplier\_pay\_status\_text  
tracking\_number  
tracking\_url  
waybill\_url  
raw\_request\_json  
raw\_response\_json  
last\_synced\_at  
error\_message  
created\_at  
updated\_at  
---

## **7\. supplier\_order\_items**

id  
supplier\_order\_id  
order\_item\_id  
third\_item\_id  
basic\_product\_id  
supplier\_product\_id  
supplier\_product\_name  
supplier\_size\_id  
supplier\_color\_id  
supplier\_size\_name  
supplier\_color\_name  
show\_image  
quantity  
product\_amount  
total\_amount  
total\_weight  
raw\_json  
created\_at  
updated\_at  
---

# **六、开发分工**

# **开发一：商品 / 供应商产品基础数据 / 字段映射**

## **负责范围**

开发一负责商品侧和供应商产品基础数据，不负责订单支付调用。

## **具体任务**

### **1\. 同步基础选品详情**

对接：

GET /open/v1/basicProduct/{id}

入库：

basic\_product\_id  
code  
name  
en\_name  
purchase\_price  
produce\_country  
warehouse\_name  
deliver\_goods\_text  
product\_show\_master\_image  
transport\_types\_arr  
---

### **2\. 保存颜色 / 尺码 / 变体**

从基础选品详情保存：

colors\[\].id  
colors\[\].name  
sizes\[\].id  
sizes\[\].name  
items\[\].id  
items\[\].code  
items\[\].size\_id  
items\[\].color\_id  
items\[\].price  
items\[\].weight  
items\[\].length  
items\[\].width  
items\[\].height  
---

### **3\. 保存设计面和印刷区域**

从基础选品详情保存：

views\[\].id  
views\[\].name  
views\[\].en\_name  
print\_areas\[\].view\_id  
print\_areas\[\].width  
print\_areas\[\].height  
---

### **4\. 商品 draft / publish 支持供应商字段**

商品草稿必须能保存：

basic\_product\_id  
supplier\_product\_id  
supplier\_material\_id  
supplier\_size\_id  
supplier\_color\_id  
view\_id  
design\_type  
supplier\_mockup\_image\_url  
---

### **5\. 商品展示图规则**

卖家后台和买家端商品图优先使用：

supplier\_mockup\_image\_url

该图来自：

GET /open/v1/product/{id}  
→ variants\[\].show\_images  
→ 或 show\_images\[\].images\[0\].src  
---

## **开发一验收标准**

* 可以保存一个 S2BDIY 基础选品；  
* 可以看到颜色、尺码、变体；  
* 可以看到 view\_id 和设计区域宽高；  
* 商品草稿可以绑定 basic\_product\_id；  
* 商品可以保存 quickCreate 返回的 supplier\_product\_id；  
* 商品可以保存供应商效果图；  
* 商品 publish 后买家端展示供应商效果图。

---

# **开发二：S2BDIY Adapter / 订单支付履约主线**

## **负责范围**

开发二负责所有 S2BDIY API 调用、订单推送、支付订单、状态同步。

## **具体任务**

### **1\. 建 S2BDIY adapter**

建议目录：

apps/medusa-backend/src/modules/suppliers/s2bdiy/

建议文件：

s2bdiy-client.ts  
s2bdiy-auth.ts  
s2bdiy-material.ts  
s2bdiy-product.ts  
s2bdiy-logistics.ts  
s2bdiy-order.ts  
s2bdiy-status-mapper.ts  
---

### **2\. Token 管理**

对接：

POST /open/v1/accessToken

实现：

获取 token  
缓存 token  
过期刷新  
所有请求自动带 Authorization  
---

### **3\. 上传素材**

对接：

POST /open/v1/material/uploadMaterial

逻辑：

读取 Phase 2A 生成的 print\_file  
以 file 二进制上传  
保存 material\_id / name / image\_url  
---

### **4\. 创建供应商产品**

对接：

POST /open/v1/product/quickCreate

逻辑：

material\_id  
basic\_product\_id  
size\_id  
color\_id  
view\_id  
design\_type  
→ quickCreate  
→ supplier\_product\_id

然后调用：

GET /open/v1/product/{id}

同步：

show\_images  
variants  
supplier\_mockup\_image\_url  
tip\_levels  
---

### **5\. 运费试算**

对接：

GET /open/v1/logisticsCalculation

逻辑：

basic\_product\_id  
country  
postcode  
weight  
length  
width  
height  
num  
platform \= 99  
→ logistics\_platform\_id

保存：

logistics\_id \= logistics\_platform\_id  
shipping\_amount  
delivery days  
---

### **6\. 创建 S2BDIY 订单**

对接：

POST /open/v1/order

订单 item 优先使用：

supplier\_product\_id  
size\_id  
color\_id  
num

`third_order_id` 使用 CitiGoo order\_id。  
 `platform` 默认使用 `99`。

如果没有 `supplier_product_id`，再走兜底：

POST /open/v1/order/createWithDesign

但第一版主流程应尽量要求商品 publish 前已经 quickCreate 成功。

---

### **7\. 支付订单**

对接：

POST /open/v1/orderPay

请求：

{  
 "ids": \[supplier\_order\_id\]  
}

支付成功后，状态更新为：

supplier\_payment\_status \= paid

如果失败：

supplier\_payment\_status \= failed  
error\_code \= S2B\_ORDER\_PAY\_FAILED  
---

### **8\. 轮询订单详情**

对接：

GET /open/v1/order/{id}

同步：

status  
status\_text  
pay\_status  
pay\_status\_text  
product\_amount  
shipping\_amount  
total\_amount  
tracking\_number  
waybill\_url  
logistics\_status

同步到 CitiGoo：

fulfillment\_status  
shipment  
tracking\_number  
tracking\_url / waybill\_url  
---

### **9\. 面单上传预留**

对接：

POST /open/v1/order/{id}/logistics

第一版如果使用 S2BDIY 平台物流，可以先不强制实现上传面单。  
 但开发二要保留 adapter 方法，后续如果切换自有物流再接。

---

## **开发二验收标准**

* 能获取 token；  
* 能上传 print\_file；  
* 能 quickCreate 生成 supplier\_product\_id；  
* 能查询 product detail 拿到供应商效果图；  
* 能试算运费并拿到 logistics\_platform\_id；  
* Stripe paid 后能创建 S2BDIY 订单；  
* 能调用 orderPay；  
* 能查询订单详情；  
* 能同步订单状态、支付状态、费用、物流单号；  
* 失败时保存 raw\_response 和 error\_message。

---

# **开发三：文档 / Seed / Postman / 联调 / 验收**

## **负责范围**

开发三负责把接口流程文档化、测试集合化，并牵头联调。

## **具体任务**

### **1\. 更新文档**

新增或更新：

docs/suppliers/s2bdiy.md  
docs/fulfillment.md  
docs/schema.md  
docs/api.md  
docs/testing.md  
---

### **2\. 编写 S2BDIY 字段映射表**

至少包括：

CitiGoo product → S2BDIY basic\_product  
CitiGoo print\_file → S2BDIY material  
CitiGoo product variant → S2BDIY size\_id / color\_id  
CitiGoo product image → S2BDIY product detail show\_images  
CitiGoo order → S2BDIY order  
CitiGoo shipment → S2BDIY order\_logistics  
---

### **3\. Postman / Apifox 测试集合**

必须覆盖：

1\. 获取 token  
2\. 获取 basic product detail  
3\. 上传素材  
4\. quickCreate 产品  
5\. 获取 product detail  
6\. 运费试算  
7\. 创建订单  
8\. 支付订单  
9\. 查询订单详情  
10\. 同步 tracking  
---

### **4\. Seed 测试数据**

准备：

supplier \= S2BDIY  
test basic\_product\_id  
test size\_id  
test color\_id  
test view\_id  
test print\_file  
test material\_id  
test supplier\_product\_id  
test logistics\_id  
test supplier\_order  
---

### **5\. 状态流转测试**

测试状态：

CitiGoo order paid  
→ supplier\_order\_created  
→ supplier\_payment\_pending  
→ supplier\_paid  
→ supplier\_reviewing  
→ supplier\_in\_production  
→ supplier\_shipped  
→ shipment\_created  
---

### **6\. 异常测试**

必须测试：

token 过期  
素材上传失败  
quickCreate 失败  
product detail 无图片  
缺少 logistics\_id  
创建订单失败  
orderPay 失败  
订单状态轮询失败  
tracking 为空  
---

## **开发三验收标准**

* 文档完整；  
* Postman 可跑通主流程；  
* seed 可重复执行；  
* S2BDIY 字段映射清楚；  
* default\_store / test\_store 隔离测试通过；  
* 每个失败场景有错误码；  
* develop 分支始终可启动。

---

# **七、Phase 2B 开发顺序**

## **Step 1：开发二接 token**

accessToken  
→ token 缓存  
→ Bearer Authorization

## **Step 2：开发一接基础选品详情**

basicProduct detail  
→ colors / sizes / items / views / print\_areas 入库

## **Step 3：开发二接素材上传**

AI print\_file  
→ uploadMaterial  
→ material\_id

## **Step 4：开发二接 quickCreate**

material\_id \+ basic\_product\_id \+ view\_id \+ design\_type  
→ supplier\_product\_id

## **Step 5：开发二接 product detail**

supplier\_product\_id  
→ show\_images / variants\[\].show\_images  
→ supplier\_mockup\_image\_url

## **Step 6：开发二接运费试算**

basic\_product\_id \+ address \+ weight \+ size  
→ logistics\_platform\_id

## **Step 7：开发二接创建订单**

Stripe paid  
→ create S2BDIY order  
→ supplier\_order\_id

## **Step 8：开发二接支付订单**

supplier\_order\_id  
→ orderPay  
→ pay\_status

## **Step 9：开发二接订单详情轮询**

order detail  
→ status / pay\_status / tracking  
→ CitiGoo shipment

## **Step 10：开发三完整联调**

AI 商品  
→ upload material  
→ quickCreate  
→ product detail 展示效果图  
→ publish  
→ cart  
→ Stripe paid  
→ logisticsCalculation  
→ create S2B order  
→ orderPay  
→ order detail  
→ tracking  
---

# **八、Phase 2B 最终验收标准**

Phase 2B 完成后，必须能演示：

1. 获取 S2BDIY token 成功；  
2. 获取基础选品详情成功；  
3. 保存 size\_id、color\_id、view\_id、print\_area 成功；  
4. 上传 AI print\_file 成功；  
5. quickCreate 创建供应商产品成功；  
6. 保存 supplier\_product\_id 成功；  
7. 获取 product detail 成功；  
8. 卖家能看到供应商生成的商品效果图；  
9. 买家商品详情页显示供应商效果图；  
10. 运费试算成功；  
11. Stripe 支付后自动创建 S2BDIY 订单；  
12. 自动调用 orderPay；  
13. 保存 supplier\_order\_id；  
14. 查询订单详情成功；  
15. 同步订单状态；  
16. 同步支付状态；  
17. 同步 product\_amount / shipping\_amount / total\_amount；  
18. 同步 tracking number；  
19. 买家订单查询页显示 tracking；  
20. 卖家后台订单详情显示供应商履约状态；  
21. 无 webhook 情况下轮询正常；  
22. default\_store / test\_store 数据隔离通过。

